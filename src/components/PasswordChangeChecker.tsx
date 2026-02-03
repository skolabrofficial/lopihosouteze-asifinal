import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ForcePasswordChange from './ForcePasswordChange';

interface PasswordChangeCheckerProps {
  children: React.ReactNode;
}

export default function PasswordChangeChecker({ children }: PasswordChangeCheckerProps) {
  const { user, loading } = useAuth();
  const [requiresChange, setRequiresChange] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      setRequiresChange(false);
      return;
    }

    checkPasswordChange();
  }, [user]);

  const checkPasswordChange = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      // Use raw fetch since the column might not be in types yet
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=requires_password_change`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setRequiresChange(data[0].requires_password_change === true);
        }
      }
    } catch (error) {
      console.error('Error checking password change requirement:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleComplete = () => {
    setRequiresChange(false);
  };

  if (loading || checking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <ForcePasswordChange open={requiresChange} onComplete={handleComplete} />
    </>
  );
}
