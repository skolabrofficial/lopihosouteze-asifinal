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
const DEV_FALLBACK_URL = "https://verbose-train-vwjg7vqjw9wfxqvr-8080.app.github.dev";
const TOKEN_EXCHANGE_MAX_ATTEMPTS = 3;
const TOKEN_EXCHANGE_RETRY_DELAY_MS = 350;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function maskValue(value: string | null | undefined, visible = 8): string {
  if (!value) {
    return "<null>";
  }

  if (value.length <= visible) {
    return value;
  }

  return `${value.slice(0, visible)}...`;
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    console.log(`[oauth-callback][${requestId}] OPTIONS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fallbackOrigin = DEV_FALLBACK_URL;

  // Detect origin from request headers (for dev environments)
  let origin = fallbackOrigin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      origin = `${refererUrl.protocol}//${refererUrl.host}`;
      console.log(`[oauth-callback][${requestId}] Detected origin from referer`, {
        origin,
      });
    } catch {
      console.warn(`[oauth-callback][${requestId}] Invalid referer header, using fallback`, {
        referer,
        fallbackOrigin,
      });
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const clientIP =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (!checkRateLimit(clientIP)) {
    console.warn(`[oauth-callback][${requestId}] Rate limit exceeded`, {
      clientIP,
    });
    return new Response(
      JSON.stringify({
        error: "Too many requests",
      }),
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    console.log(`[oauth-callback][${requestId}] Request received`, {
      method: req.method,
      url: req.url,
      clientIP,
      origin,
    });

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    console.log(`[oauth-callback][${requestId}] Query params`, {
      code: maskValue(code, 12),
      state: maskValue(state, 12),
    });

    if (!code) {
      console.warn(`[oauth-callback][${requestId}] Missing code`);
      return Response.redirect(
        `${origin}/oauth?error=missing_code`,
        302
      );
    }

    if (!state) {
      console.warn(`[oauth-callback][${requestId}] Missing state`);
      return Response.redirect(
        `${origin}/oauth?error=missing_state`,
        302
      );
    }

    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .select("id, expires_at, used_at")
      .eq("state", state)
      .maybeSingle();

    console.log(`[oauth-callback][${requestId}] State validation result`, {
      found: !!stateRecord,
      error: stateError?.message,
    });

    if (stateError || !stateRecord) {
      console.warn(`[oauth-callback][${requestId}] Invalid state record`, {
        state: maskValue(state, 12),
      });
      return Response.redirect(
        `${origin}/oauth?error=invalid_state`,
        302
      );
    }

    const now = new Date();
    const isExpired = new Date(stateRecord.expires_at).getTime() <= now.getTime();
    const isUsed = Boolean(stateRecord.used_at);

    if (isExpired || isUsed) {
      console.warn(`[oauth-callback][${requestId}] State expired or already used`, {
        isExpired,
        isUsed,
      });
      return Response.redirect(
        `${origin}/oauth?error=invalid_state`,
        302
      );
    }

    // OAuth config
    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
    const tokenUrl = Deno.env.get("OAUTH_TOKEN_URL");
    const userInfoUrl = Deno.env.get("OAUTH_USERINFO_URL");

    if (!clientId || !clientSecret || !tokenUrl || !userInfoUrl) {
      console.error(`[oauth-callback][${requestId}] Missing OAuth configuration`, {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        hasTokenUrl: Boolean(tokenUrl),
        hasUserInfoUrl: Boolean(userInfoUrl),
      });
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

    let tokenResponse: Response | null = null;

    for (let attempt = 1; attempt <= TOKEN_EXCHANGE_MAX_ATTEMPTS; attempt++) {
      try {
        tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString(),
        });
        break;
      } catch (fetchError) {
        console.error(`[oauth-callback][${requestId}] Token exchange request error`, {
          attempt,
          maxAttempts: TOKEN_EXCHANGE_MAX_ATTEMPTS,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        });

        if (attempt === TOKEN_EXCHANGE_MAX_ATTEMPTS) {
          return Response.redirect(
            `${origin}/oauth?error=token_exchange`,
            302
          );
        }

        await sleep(TOKEN_EXCHANGE_RETRY_DELAY_MS * attempt);
      }
    }

    if (!tokenResponse) {
      return Response.redirect(
        `${origin}/oauth?error=token_exchange`,
        302
      );
    }

    console.log(`[oauth-callback][${requestId}] Token exchange response`, {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
    });

    if (!tokenResponse.ok) {
      const tokenBody = await tokenResponse.text();
      console.error(`[oauth-callback][${requestId}] Token exchange failed`, {
        status: tokenResponse.status,
        bodyPreview: maskValue(tokenBody, 120),
      });
      return Response.redirect(
        `${origin}/oauth?error=token_exchange`,
        302
      );
    }

    const tokenData = await tokenResponse.json();

    const { error: stateUpdateError } = await supabaseAdmin
      .from("oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("id", stateRecord.id)
      .is("used_at", null);

    if (stateUpdateError) {
      console.error(`[oauth-callback][${requestId}] Failed to mark state as used`, {
        message: stateUpdateError.message,
        details: stateUpdateError.details,
      });
      return Response.redirect(
        `${origin}/oauth?error=invalid_state`,
        302
      );
    }

    // Fetch user info from Alík
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    console.log(`[oauth-callback][${requestId}] User info response`, {
      status: userInfoResponse.status,
      ok: userInfoResponse.ok,
    });

    if (!userInfoResponse.ok) {
      const userInfoBody = await userInfoResponse.text();
      console.error(`[oauth-callback][${requestId}] User info fetch failed`, {
        status: userInfoResponse.status,
        bodyPreview: maskValue(userInfoBody, 120),
      });
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

    console.log(`[oauth-callback][${requestId}] User data parsed`, {
      username,
      alikUserId: maskValue(alikUserId, 12),
      userLink,
    });

    const avatarUrl = username
      ? `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`
      : null;

    if (!username || !alikUserId) {
      console.warn(`[oauth-callback][${requestId}] Invalid user data payload`);
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
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

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
        console.error(`[oauth-callback][${requestId}] Create user error`, {
          message: error.message,
          details: error.details,
        });
        return Response.redirect(
          `${origin}/oauth?error=create_user_failed`,
          302
        );
      }

      userId = newUser.user.id;
    }

    // Create login session via Supabase magic link flow.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${origin}/oauth`,
        },
      });

    console.log(`[oauth-callback][${requestId}] Session generation result`, {
      userId,
      error: linkError?.message,
      hasActionLink: Boolean(linkData?.properties?.action_link),
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[oauth-callback][${requestId}] Session generation error`, {
        message: linkError?.message,
        details: linkError?.details,
      });
      return Response.redirect(
        `${origin}/oauth?error=session_failed`,
        302
      );
    }

    console.log(`[oauth-callback][${requestId}] Redirecting to action link`);
    return Response.redirect(linkData.properties.action_link, 302);
  } catch (error) {
    console.error(`[oauth-callback][${requestId}] OAuth callback error`, {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return Response.redirect(
      `${origin}/oauth?error=unexpected`,
      302
    );
  }
});
