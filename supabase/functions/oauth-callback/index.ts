import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // CORS proxy fallback
  const CORS_PROXY = "https://cors.io/?";
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { code, redirectUri } = body;

    if (!code) {
      throw new Error("missing_code");
    }

    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Missing OAuth credentials in Supabase secrets");
    }

    console.log("Starting token exchange with code:", code.substring(0, 20));

    // Try direct request first
    let tokenResponse = await fetch("https://www.alik.cz/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    }).catch((err) => {
      console.error("Direct request failed:", err.message);
      return null;
    });

    // If direct fails, try CORS proxy
    if (!tokenResponse || !tokenResponse.ok) {
      console.log("Trying with CORS proxy...");
      tokenResponse = await fetch(
        CORS_PROXY + "https://www.alik.cz/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        }
      ).catch(() => null);
    }

    if (!tokenResponse || !tokenResponse.ok) {
      const text = tokenResponse ? await tokenResponse.text() : "No response";
      console.error("Token exchange failed:", text);
      throw new Error("token_exchange_failed");
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("no_access_token");
    }

    console.log("Token obtained, fetching user info...");

    // Get user info
    const userInfoResponse = await fetch("https://www.alik.cz/oauth/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }).catch(() => null);

    if (!userInfoResponse || !userInfoResponse.ok) {
      throw new Error("userinfo_failed");
    }

    const userData = await userInfoResponse.json();
    const username = userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;

    if (!username || !alikUserId) {
      throw new Error("invalid_user_data");
    }

    console.log("User data valid, creating/updating user:", alikUserId);

    const email = `alik_${alikUserId}@ls.local`;
    const avatarUrl = username
      ? `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`
      : null;

    // Find or create user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = users.users.find(
      (u) => u.user_metadata?.alik_user_id === alikUserId
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          username,
          avatar_url: avatarUrl,
        },
      });
    } else {
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            username,
            alik_user_id: alikUserId,
            avatar_url: avatarUrl,
            oauth_provider: "alik",
          },
        });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
    }

    // Update or create profile
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        username,
        avatar_url: avatarUrl,
      });

    // Create session
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (sessionError) {
      throw new Error(`Session error: ${sessionError.message}`);
    }

    const actionLink = sessionData.properties.action_link;
    const hashPart = actionLink.split("#")[1];

    console.log("OAuth callback successful for user:", userId);

    return new Response(
      JSON.stringify({
        accessToken: hashPart,
        refreshToken: hashPart,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
