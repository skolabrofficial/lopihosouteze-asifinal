// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATE_TTL_MINUTES = 10;

function randomHex(byteLength = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const clientId = Deno.env.get("OAUTH_CLIENT_ID");
    const authUrl = Deno.env.get("OAUTH_AUTH_URL") || "https://www.alik.cz/oauth/authorize";
    const siteUrl = Deno.env.get("SITE_URL") || "https://lopi.yo2.cz";

    if (!clientId) {
      return Response.redirect(`${siteUrl}/oauth?error=config_error`, 302);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const requestUrl = new URL(req.url);
    const state = requestUrl.searchParams.get("state") || randomHex();
    const origin = sanitizeOrigin(requestUrl.searchParams.get("origin")) || siteUrl;

    const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("oauth_states")
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},used_at.not.is.null`);

    const { error: insertError } = await supabaseAdmin.from("oauth_states").insert({
      state,
      code_verifier: randomHex(),
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Failed to persist OAuth state", insertError);
      return Response.redirect(`${origin}/oauth?error=state_store_failed`, 302);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    return Response.redirect(`${authUrl}?${authParams.toString()}`, 302);
  } catch (error) {
    console.error("OAuth start error:", error);

    return Response.redirect(`https://lopi.yo2.cz/oauth?error=unexpected`, 302);
  }
});
