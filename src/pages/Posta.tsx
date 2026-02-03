import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Inbox from '@/components/Inbox';
import { Loader2 } from 'lucide-react';

export default function Posta() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Inbox />
      </div>
    </div>
  );
}
