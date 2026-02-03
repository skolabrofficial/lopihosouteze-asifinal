// PKCE helper functions for OAuth 2.0

// Generate a random string for code_verifier
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Generate code_challenge from code_verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

// Base64 URL encode
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate random state for CSRF protection
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Store PKCE values in sessionStorage (client-side backup)
export function storePKCEValues(state: string, codeVerifier: string): void {
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
}

// Store state and code_verifier server-side for CSRF protection
export async function storeStateServerSide(state: string, codeVerifier: string): Promise<boolean> {
  try {
    // Try to store in oauth_states table (if it exists)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/oauth_states`,
      {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          state,
          code_verifier: codeVerifier,
          expires_at: expiresAt.toISOString()
        })
      }
    );

    if (response.ok) {
      console.log('OAuth state stored server-side');
      return true;
    } else {
      // Table might not exist - fall back to client-side storage
      console.warn('Could not store OAuth state server-side, using client-side fallback');
      return false;
    }
  } catch (error) {
    console.warn('Error storing OAuth state server-side:', error);
    return false;
  }
}

// Retrieve and clear PKCE values
export function retrievePKCEValues(): { state: string | null; codeVerifier: string | null } {
  const state = sessionStorage.getItem('oauth_state');
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_code_verifier');
  return { state, codeVerifier };
}

// Build OAuth authorization URL
export async function buildAuthorizationUrl(
  authorizationUrl: string,
  clientId: string,
  redirectUri: string,
  scope: string = 'openid profile'
): Promise<{ url: string; state: string; codeVerifier: string }> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Try to store server-side for CSRF protection
  await storeStateServerSide(state, codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `${authorizationUrl}?${params.toString()}`,
    state,
    codeVerifier,
  };
}
