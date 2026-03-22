import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const origin = Deno.env.get("SITE_URL") || "https://lopi.yo2.cz";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const clientIP =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
      }),
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // ===== VALIDACE STATE (CSRF OCHRANA) =====
    if (!state) {
      return Response.redirect(
        `${origin}/oauth?error=missing_state`,
        302
      );
    }

    // Ověřte state v databázi
    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .single();

    if (stateError || !stateRecord) {
      return Response.redirect(
        `${origin}/oauth?error=invalid_state`,
        302
      );
    }

    // Kontrola expiraci
    if (new Date() > new Date(stateRecord.expires_at)) {
      return Response.redirect(
        `${origin}/oauth?error=state_expired`,
        302
      );
    }

    // Kontrola, zda nebyl state již použit
    if (stateRecord.used_at) {
      return Response.redirect(
        `${origin}/oauth?error=state_reused`,
        302
      );
    }
    // ===== KONEC VALIDACE STATE =====

    if (!code) {
      return Response.redirect(
        `${origin}/oauth?error=missing_code`,
        302
      );
    }

    // OAuth config
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");

    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      return Response.redirect(
        `${origin}/oauth?error=config_error`,
        302
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Exchange code → access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      return Response.redirect(
        `${origin}/oauth?error=token_exchange`,
        302
      );
    }

    const tokenData = await tokenResponse.json();

    // Fetch user info from Alík
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return Response.redirect(
        `${origin}/oauth?error=userinfo_failed`,
        302
      );
    }

    const userData = await userInfoResponse.json();

    const username =
      userData.nickname || userData.username || userData.name;
    const alikUserId = userData.sub;
    const userLink = userData.user_link;

    const avatarUrl = username
      ? `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`
      : null;

    if (!username || !alikUserId) {
      return Response.redirect(
        `${origin}/oauth?error=invalid_user_data`,
        302
      );
    }

    const email = `alik_${alikUserId}@ls.local`;

    // Find user by metadata
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
          user_link: userLink,
          avatar_url: avatarUrl,
        },
      });

      await supabaseAdmin
        .from("profiles")
        .update({
          username,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);
    } else {
      const randomPassword =
        crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            username,
            alik_user_id: alikUserId,
            user_link: userLink,
            avatar_url: avatarUrl,
            oauth_provider: "alik",
          },
        });

      if (error) {
        console.error(error);
        return Response.redirect(
          `${origin}/oauth?error=create_user_failed`,
          302
        );
      }

      userId = newUser.user.id;
    }

    // ===== OZNAČTE STATE JAKO POUŽITÝ =====
    await supabaseAdmin
      .from("oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state", state);
    // ===== KONEC OZNAČENÍ STATE =====

    // Create login session via magiclink
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: origin,
        },
      });

    if (linkError) {
      console.error(linkError);
      return Response.redirect(
        `${origin}/oauth?error=session_failed`,
        302
      );
    }

    const actionLink = linkData.properties.action_link;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: actionLink,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);

    return Response.redirect(
      `https://lopi.yo2.cz/oauth?error=unexpected`,
      302
    );
  }
});
