import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trophy, Sparkles, ExternalLink } from 'lucide-react';
import alikLogo from '@/assets/alik-logo.png';
import { useOAuth } from '@/hooks/useOAuth';

export default function AuthExternal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startOAuthFlow, isConfigured: isOAuthConfigured } = useOAuth();
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleOAuthLogin = async () => {
    setOauthLoading(true);
    try {
      await startOAuthFlow();
    } catch (error) {
      toast.error('Chyba při přihlašování přes Alíka');
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-success/20 rounded-full blur-2xl animate-pulse-slow" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-bounce-subtle">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-display font-bold gradient-text">
              Lopiho Soutěž
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Externí přihlášení
              <Sparkles className="w-4 h-4 text-primary" />
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground text-sm">
            <p>Přihlaš se pomocí svého Alíkovského účtu.</p>
            <p className="mt-2">Tvůj avatar a přezdívka budou automaticky synchronizovány.</p>
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full gap-3"
            disabled={oauthLoading || !isOAuthConfigured}
            onClick={handleOAuthLogin}
          >
            <img src={alikLogo} alt="Alík" className="w-6 h-6" />
            {oauthLoading ? 'Přesměrovávám na Alíka...' : 'Přihlásit se přes Alíka'}
            <ExternalLink className="w-4 h-4" />
          </Button>

          {!isOAuthConfigured && (
            <p className="text-center text-sm text-destructive">
              OAuth není nakonfigurováno
            </p>
          )}

          <div className="text-center">
            <Button
              variant="link"
              className="text-muted-foreground"
              onClick={() => navigate('/auth')}
            >
              Zpět na klasické přihlášení
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
