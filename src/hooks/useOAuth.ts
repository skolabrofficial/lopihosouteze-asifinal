import { useCallback } from 'react';
import { 
  buildAuthorizationUrl, 
  storePKCEValues,
  retrievePKCEValues 
} from '@/lib/oauth';

// OAuth configuration for Alík
const OAUTH_CONFIG = {
  authorizationUrl: 'https://www.alik.cz/oauth/authorize',
  clientId: '5b79f527e84fe9c09cbfd827fb586c86b1ffe223e756d8b6',
  scope: 'identity',
};

export function useOAuth() {
  const startOAuthFlow = useCallback(async () => {
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`;
    
    if (!OAUTH_CONFIG.authorizationUrl || !OAUTH_CONFIG.clientId) {
      console.error('OAuth not configured. Set VITE_OAUTH_AUTHORIZATION_URL and VITE_OAUTH_CLIENT_ID');
      throw new Error('OAuth není nakonfigurováno');
    }

    const { url, state, codeVerifier } = await buildAuthorizationUrl(
      OAUTH_CONFIG.authorizationUrl,
      OAUTH_CONFIG.clientId,
      redirectUri,
      OAUTH_CONFIG.scope
    );

    // Store PKCE values for later verification
    storePKCEValues(state, codeVerifier);

    // Redirect to OAuth provider
    window.location.href = url;
  }, []);

  const handleOAuthCallback = useCallback(() => {
    const { state, codeVerifier } = retrievePKCEValues();
    return { state, codeVerifier };
  }, []);

  return {
    startOAuthFlow,
    handleOAuthCallback,
    isConfigured: Boolean(OAUTH_CONFIG.authorizationUrl && OAUTH_CONFIG.clientId),
  };
}
