import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredState, getStoredState, getSupabaseUrl } from "@/lib/oauth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Neplatný nebo expirovaný stav přihlášení. Zkus přihlášení znovu.",
  missing_state: "Chybí bezpečnostní parametr state. Zkus přihlášení znovu.",
  missing_code: "Přihlašovací kód nebyl doručen.",
  token_exchange: "Nepodařilo se ověřit přihlášení u Alíka.",
  userinfo_failed: "Nepodařilo se načíst údaje o účtu z Alíka.",
  create_user_failed: "Nepodařilo se vytvořit uživatele.",
  session_failed: "Nepodařilo se vytvořit relaci. Zkus to prosím znovu.",
  config_error: "OAuth není správně nakonfigurované.",
  state_store_failed: "Nepodařilo se připravit bezpečné přihlášení.",
  unexpected: "Při přihlášení nastala neočekávaná chyba.",
};

function getErrorMessage(errorCode: string | null): string {
  if (!errorCode) {
    return "Při přihlášení nastala chyba.";
  }

  return ERROR_MESSAGES[errorCode] || errorCode;
}

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorCode = params.get("error");
      const errorDescription = params.get("error_description");
      const code = params.get("code");
      const callbackState = params.get("state");

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

      if (errorCode) {
        setError(errorDescription || getErrorMessage(errorCode));
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
        setError("Nepodařilo se nastavit přihlášení");
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
