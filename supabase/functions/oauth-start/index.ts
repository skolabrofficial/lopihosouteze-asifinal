// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATE_TTL_MINUTES = 10;
const DEV_FALLBACK_URL = "https://verbose-train-vwjg7vqjw9wfxqvr-8080.app.github.dev";

function maskValue(value: string | null, visible = 8): string {
  if (!value) {
    return "<null>";
  }

  if (value.length <= visible) {
    return value;
  }

  return `${value.slice(0, visible)}...`;
}

function sanitizeOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    console.log(`[oauth-start][${requestId}] OPTIONS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;  
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("OAUTH_CLIENT_ID");
  const authUrl = Deno.env.get("OAUTH_AUTH_URL") || "https://www.alik.cz/oauth/authorize";
  const fallbackSiteUrl = DEV_FALLBACK_URL;

  try {
    console.log(`[oauth-start][${requestId}] Request received`, {
      method: req.method,
      url: req.url,
      hasClientId: Boolean(clientId),
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const requestUrl = new URL(req.url);
    
    // Detect origin from request headers (for dev environments)
    let siteUrl = fallbackSiteUrl;
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        siteUrl = `${refererUrl.protocol}//${refererUrl.host}`;
        console.log(`[oauth-start][${requestId}] Detected siteUrl from referer`, {
          siteUrl,
        });
      } catch {
        console.warn(`[oauth-start][${requestId}] Invalid referer header, using fallback`, {
          referer,
          fallbackSiteUrl,
        });
      }
    }

    if (!clientId) {
      console.error(`[oauth-start][${requestId}] Missing OAUTH_CLIENT_ID`);
      return Response.redirect(`${siteUrl}/oauth?error=config_error`, 302);
    }

    const state = requestUrl.searchParams.get("state") || crypto.randomUUID();
    const origin = sanitizeOrigin(requestUrl.searchParams.get("origin")) || siteUrl;

    console.log(`[oauth-start][${requestId}] Parsed request params`, {
      state: maskValue(state),
      origin,
      siteUrl,
    });

    const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60 * 1000).toISOString();

    // Clean old/used state rows to keep table small.
    await supabaseAdmin
      .from("oauth_states")
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},used_at.not.is.null`);

    console.log(`[oauth-start][${requestId}] Cleanup executed`);

    const { error: insertError } = await supabaseAdmin.from("oauth_states").insert({
      state,
      code_verifier: crypto.randomUUID(),
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error(`[oauth-start][${requestId}] Failed to persist OAuth state`, {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return Response.redirect(`${origin}/oauth?error=state_store_failed`, 302);
    }

    console.log(`[oauth-start][${requestId}] State persisted`, {
      state: maskValue(state),
      expiresAt,
    });

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    const redirectTarget = `${authUrl}?${authParams.toString()}`;
    console.log(`[oauth-start][${requestId}] Redirecting to OAuth provider`, {
      redirectUri,
      redirectTargetPreview: maskValue(redirectTarget, 60),
    });

    return Response.redirect(redirectTarget, 302);
  } catch (error) {
    console.error(`[oauth-start][${requestId}] OAuth start error`, {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return Response.redirect(`${fallbackSiteUrl}/oauth?error=unexpected`, 302);
  }
});
