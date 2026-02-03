import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trophy, Sparkles, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import alikLogo from '@/assets/alik-logo.png';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useOAuth } from '@/hooks/useOAuth';

const loginSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, 'Jméno musí mít alespoň 3 znaky').max(20, 'Jméno může mít max 20 znaků'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { startOAuthFlow, isConfigured: isOAuthConfigured } = useOAuth();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!z.string().email().safeParse(resetEmail).success) {
      toast.error('Neplatný email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setLoading(false);

    if (error) {
      toast.error('Chyba při odesílání emailu');
    } else {
      toast.success('Email s odkazem pro reset hesla byl odeslán!');
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user && !isResetMode) {
      navigate('/');
    }
  }, [user, navigate, isResetMode]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Hesla se neshodují');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error('Chyba při změně hesla');
    } else {
      toast.success('Heslo bylo úspěšně změněno!');
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Nesprávný email nebo heslo');
      } else {
        toast.error('Chyba při přihlášení');
      }
    } else {
      toast.success('Úspěšně přihlášeno!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.username);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Tento email je již registrován');
      } else {
        toast.error('Chyba při registraci');
      }
    } else {
      toast.success('Účet vytvořen! Vítej v soutěži!');
      navigate('/');
    }
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <Card className="w-full max-w-md relative z-10 shadow-hero border-0 bg-card/95 backdrop-blur-sm animate-scale-in">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold gradient-text">
                Nastavit nové heslo
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Zadejte své nové heslo
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Nové heslo
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Potvrdit heslo
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Ukládám...' : 'Změnit heslo'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapomenuté heslo</DialogTitle>
            <DialogDescription>
              Zadejte svůj email a pošleme vám odkaz pro reset hesla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="prezdivka@ls.ls"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Odesílám...' : 'Odeslat reset email'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
              Připoj se k soutěži a sbírej body!
              <Sparkles className="w-4 h-4 text-primary" />
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-semibold">Přihlášení & Registrace</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative my-4">
                  <Separator />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                  disabled={oauthLoading || !isOAuthConfigured}
                  onClick={async () => {
                    setOauthLoading(true);
                    try {
                      await startOAuthFlow();
                    } catch (error) {
                      toast.error('Chyba při přihlašování přes OAuth');
                      setOauthLoading(false);
                    }
                  }}
                >
                  <img src={alikLogo} alt="Alík" className="w-5 h-5" />
                  {oauthLoading ? 'Přesměrovávám...' : 'Přihlásit přes Alíka'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
