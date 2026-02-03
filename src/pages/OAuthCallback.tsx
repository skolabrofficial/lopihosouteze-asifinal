import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || 'Přihlášení selhalo');
          return;
        }

        // Check if this is a magic link callback (from our edge function)
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (tokenHash && type === 'magiclink') {
          // Verify the magic link
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });

          if (verifyError) {
            console.error('Magic link verification error:', verifyError);
            setStatus('error');
            setErrorMessage(verifyError.message);
            return;
          }

          if (data.session) {
            setStatus('success');
            toast.success('Úspěšně přihlášeno!');
            setTimeout(() => navigate('/'), 1500);
            return;
          }
        }

        // Check for access_token in hash (implicit flow fallback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setStatus('error');
            setErrorMessage(sessionError.message);
            return;
          }

          setStatus('success');
          toast.success('Úspěšně přihlášeno!');
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        // Check current session - maybe already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus('success');
          toast.success('Úspěšně přihlášeno!');
          setTimeout(() => navigate('/'), 1500);
          return;
        }

        // No valid auth data found
        setStatus('error');
        setErrorMessage('Neplatná autentizační odpověď');

      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Neočekávaná chyba');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow">
            {status === 'processing' && (
              <div className="bg-primary/20 w-full h-full rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-success/20 w-full h-full rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-destructive/20 w-full h-full rounded-2xl flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-display font-bold">
            {status === 'processing' && 'Ověřuji přihlášení...'}
            {status === 'success' && 'Přihlášení úspěšné!'}
            {status === 'error' && 'Chyba přihlášení'}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === 'processing' && (
            <p className="text-muted-foreground">
              Počkej chvilku, ověřujeme tvoje přihlášení...
            </p>
          )}

          {status === 'success' && (
            <p className="text-muted-foreground">
              Za chvíli tě přesměrujeme na hlavní stránku.
            </p>
          )}

          {status === 'error' && (
            <>
              <p className="text-muted-foreground">
                {errorMessage || 'Něco se pokazilo při přihlašování.'}
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth')}
                >
                  Zkusit znovu
                </Button>
                <Button
                  variant="hero"
                  onClick={() => navigate('/')}
                >
                  Na hlavní stránku
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
