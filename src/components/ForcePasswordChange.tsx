import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

interface ForcePasswordChangeProps {
  open: boolean;
  onComplete: () => void;
}

export default function ForcePasswordChange({ open, onComplete }: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    setLoading(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Update profile to remove the password change requirement using raw API
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use fetch to update profile since types might not include new column yet
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requires_password_change: false }),
        });
      }

      toast.success('Heslo bylo úspěšně změněno!');
      onComplete();
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Nepodařilo se změnit heslo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-primary" />
            Momentík, kamaráde
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Jsem sice rád, že jsi sem zavítal, ale z bezpečnostních důvodů si prosím změň své heslo. 
            Heslo <strong>NEsmí</strong> být stejné, jako to, které máš na Alíkovi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nové heslo</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Zadej nové heslo (min. 6 znaků)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Potvrzení hesla</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Zadej heslo znovu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            variant="hero"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              'Pokračuj'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
