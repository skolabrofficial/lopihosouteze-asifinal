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

        const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID || "lopiho-soutez";
        const redirectUri = `${window.location.origin}/oauth`;

        // FRONTEND TOKEN EXCHANGE (direktně v browseru)
        console.log("Exchanging code for token...");
        const tokenResponse = await fetch("https://www.alik.cz/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            // POZOR: client_secret se NESMÍ posílat z frontendu!
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Token exchange error:", errorText);
          setError("token_exchange_failed");
          setChecking(false);
          return;
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          setError("no_access_token");
          setChecking(false);
          return;
        }

        // Get user info
        console.log("Fetching user info...");
        const userInfoResponse = await fetch("https://www.alik.cz/oauth/userinfo", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          setError("userinfo_failed");
          setChecking(false);
          return;
        }

        const userData = await userInfoResponse.json();
        const username = userData.nickname || userData.username || userData.name;
        const alikUserId = userData.sub;

        if (!username || !alikUserId) {
          setError("invalid_user_data");
          setChecking(false);
          return;
        }

        // Zavolejte backend pro vytvoření/update uživatele
        const createUserResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-create-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenData.access_token}`,
            },
            body: JSON.stringify({
              username,
              alikUserId,
              avatar: userData.avatar_url,
            }),
          }
        );

        if (!createUserResponse.ok) {
          setError("create_user_failed");
          setChecking(false);
          return;
        }

        const { sessionToken } = await createUserResponse.json();

        // Set session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: sessionToken.access_token,
          refresh_token: sessionToken.refresh_token,
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
          <p className="mb-4 text-muted-foreground">{error}</p>
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
