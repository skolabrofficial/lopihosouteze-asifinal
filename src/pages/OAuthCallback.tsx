import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredState, getStoredState, getSupabaseUrl } from "@/lib/oauth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Neplatný nebo expirovaný state",
  missing_state: "Chybí bezpečnostní state parametr",
  missing_code: "Chybí přihlašovací kód",
  token_exchange: "Nepodařilo se získat token od Alíka",
  userinfo_failed: "Nepodařilo se získat info o uživateli",
  create_user_failed: "Chyba při vytváření uživatele",
  session_failed: "Nepodařilo se nastavit session",
  config_error: "OAuth není správně nakonfigurované",
  unexpected: "Neočekávaná chyba",
};

function getErrorMessage(code: string | null): string {
  if (!code) {
    return "Při přihlášení nastala chyba";
  }

  return ERROR_MESSAGES[code] || code;
}

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get("error");
      const errorDescription = params.get("error_description");
      const code = params.get("code");
      const callbackState = params.get("state");

      // Fallback path: if provider returns code/state to frontend route, relay it to edge callback.
      if (code) {
        const storedState = getStoredState();

        if (!callbackState || !storedState || storedState !== callbackState) {
          setError(getErrorMessage("invalid_state"));
          clearStoredState();
          return;
        }

        const callbackUrl = `${getSupabaseUrl()}/functions/v1/oauth-callback?${params.toString()}`;
        window.location.replace(callbackUrl);
        return;
      }

      if (errorMsg) {
        setError(errorDescription || getErrorMessage(errorMsg));
        clearStoredState();
        return;
      }

      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("Chybí přihlašovací tokeny");
        clearStoredState();
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      clearStoredState();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setError(getErrorMessage("session_failed"));
        return;
      }

      window.history.replaceState(null, "", "/oauth");
      navigate("/", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-lg">
          <h1 className="mb-2 text-xl font-bold text-destructive">Chyba přihlášení</h1>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Zpět na hlavní stránku
            </button>
            <button
              onClick={() => navigate("/auth/exter")}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              Zkusit znovu
            </button>
          </div>
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
