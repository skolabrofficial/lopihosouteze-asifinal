const DEFAULT_SUPABASE_URL = "https://wmmwsbrevzfeqzdrcbrc.supabase.co";
const OAUTH_STATE_STORAGE_KEY = "oauth_state";

type OAuthStatePayload = {
  state: string;
  createdAt: number;
};

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  return normalizeUrl(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
}

function getOAuthStartUrl(): string {
  return `${getSupabaseUrl()}/functions/v1/oauth-start`;
}

export async function startOAuthLogin() {
  const state = crypto.randomUUID();
  const payload: OAuthStatePayload = { state, createdAt: Date.now() };
  localStorage.setItem(OAUTH_STATE_STORAGE_KEY, JSON.stringify(payload));

  const origin = encodeURIComponent(window.location.origin);
  window.location.href = `${getOAuthStartUrl()}?state=${encodeURIComponent(state)}&origin=${origin}`;
}

export function getStoredState(): string | null {
  const rawState = localStorage.getItem(OAUTH_STATE_STORAGE_KEY);

  if (!rawState) {
    return null;
  }

  try {
    const parsedState = JSON.parse(rawState) as OAuthStatePayload;
    return parsedState?.state || null;
  } catch {
    return rawState;
  }
}

export function clearStoredState() {
  localStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
}
