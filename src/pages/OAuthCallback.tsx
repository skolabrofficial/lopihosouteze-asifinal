import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoredState, clearStoredState } from "@/lib/oauth";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorMsg = params.get("error");
        const code = params.get("code");
        const state = params.get("state");

        if (errorMsg) {
          setError(errorMsg);
          clearStoredState();
          setChecking(false);
          return;
        }

        const storedState = getStoredState();
        if (!state || state !== storedState) {
          setError("invalid_state");
          clearStoredState();
          setChecking(false);
          return;
        }

        if (!code) {
          setError("missing_code");
          clearStoredState();
          setChecking(false);
          return;
        }

        const redirectUri = `${window.location.origin}/oauth`;

        // Call backend to exchange code
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              state,
              redirectUri,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "callback_failed");
          setChecking(false);
          return;
        }

        const { accessToken, refreshToken } = await response.json();

        // Parse tokens from hash
        const hashParams = new URLSearchParams(accessToken);
        const actualAccessToken = hashParams.get("access_token") || accessToken;
        const actualRefreshToken = hashParams.get("refresh_token") || refreshToken;

        // Set session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: actualAccessToken,
          refresh_token: actualRefreshToken,
        });

        clearStoredState();

        if (sessionError) {
          setError("session_failed");
          setChecking(false);
          return;
        }

        navigate("/", { replace: true });
      } catch (err) {
        console.error("Error:", err);
        setError("unexpected_error");
        setChecking(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Ověřuji přihlášení...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-destructive">Chyba přihlášení</h1>
          <p className="mb-4 text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Zpět na přihlášení
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Přihlašování...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
