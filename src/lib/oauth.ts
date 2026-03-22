import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://wmmwsbrevzfeqzdrcbrc.supabase.co";
const ALIK_AUTH_URL = "https://www.alik.cz/oauth/authorize";

export async function startOAuthLogin() {
  const state = crypto.randomUUID();
  
  // Uložte state do databáze místo localStorage
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minut
  
  const { error } = await supabase
    .from("oauth_states")
    .insert({
      state,
      code_verifier: crypto.randomUUID(), // Uložte něco jako code_verifier (nebo můžete ignorovat)
      expires_at: expiresAt,
    });

  if (error) {
    console.error("Failed to save OAuth state:", error);
    throw new Error("Chyba při inicializaci přihlášení");
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: "lopiho-soutez",
    redirect_uri: redirectUri,
    state,
  });

  window.location.href = `${ALIK_AUTH_URL}?${params.toString()}`;
}

export function getStoredState(): string | null {
  // Toto se už nepoužívá, ale necháme pro kompatibilitu
  return localStorage.getItem("oauth_state");
}

export function clearStoredState() {
  // Stav se teď maže v supabase/functions/oauth-callback/index.ts
  localStorage.removeItem("oauth_state");
}
