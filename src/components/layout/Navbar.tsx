import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  FileText, 
  HelpCircle, 
  ShoppingBag, 
  LogOut, 
  User,
  Menu,
  X,
  Coins,
  Shield,
  Mail,
  Squirrel,
  Package
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/', label: 'Domů', icon: Trophy },
  { href: '/clankovnice', label: 'Článkovnice', icon: FileText },
  { href: '/tipovacky', label: 'Tipovačky', icon: HelpCircle },
  { href: '/obchudek', label: 'Obchůdek', icon: ShoppingBag },
  { href: '/inventar', label: 'Inventář', icon: Package },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const [username, setUsername] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isVeverka, setIsVeverka] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkRole();
      fetchUnreadMessages();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username, points')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setUsername(data.username);
      setPoints(data.points);
    }
  };

  const checkRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const roles = data?.map(r => r.role as string) || [];
    const hasOrgRole = roles.some(r => r === 'organizer' || r === 'helper');
    setIsOrganizer(hasOrgRole);
    setIsVeverka(roles.includes('veverka') || hasOrgRole);
  };

  const fetchUnreadMessages = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    
    setUnreadMessages(count || 0);
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-card group-hover:shadow-glow transition-shadow">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl gradient-text hidden sm:block">
              Lopiho Soutěž
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "shadow-card"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {isVeverka && (
              <Link to="/redakce">
                <Button 
                  variant={location.pathname === '/redakce' ? "default" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Squirrel className="w-4 h-4" />
                  Redakce
                </Button>
              </Link>
            )}
            {isOrganizer && (
              <Link to="/admin">
                <Button 
                  variant={location.pathname === '/admin' ? "default" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Points Badge */}
                <div className="hidden sm:flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full font-semibold text-sm">
                  <Coins className="w-4 h-4" />
                  <span>{points} bodů</span>
                </div>

                {/* User Menu */}
                <div className="hidden lg:flex items-center gap-2">
                  <Link to="/posta">
                    <Button variant="ghost" size="icon" className="relative">
                      <Mail className="w-4 h-4" />
                      {unreadMessages > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                          {unreadMessages}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{username}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="hero" size="sm">
                  Přihlásit se
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="lg:hidden py-4 border-t animate-slide-up">
            <div className="flex flex-col gap-2">
              {/* Points on mobile */}
              <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-lg font-semibold mb-2">
                <Coins className="w-4 h-4" />
                <span>{points} bodů</span>
                <span className="text-muted-foreground ml-auto">@{username}</span>
              </div>

              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive ? "default" : "ghost"} 
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              <Link to="/posta" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={location.pathname === '/posta' ? "default" : "ghost"} 
                  className="w-full justify-start gap-3"
                >
                  <Mail className="w-5 h-5" />
                  Pošta
                  {unreadMessages > 0 && (
                    <Badge className="ml-auto bg-primary">{unreadMessages}</Badge>
                  )}
                </Button>
              </Link>

              {isVeverka && (
                <Link to="/redakce" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant={location.pathname === '/redakce' ? "default" : "ghost"} 
                    className="w-full justify-start gap-3"
                  >
                    <Squirrel className="w-5 h-5" />
                    Redakce
                  </Button>
                </Link>
              )}

              {isOrganizer && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant={location.pathname === '/admin' ? "default" : "ghost"} 
                    className="w-full justify-start gap-3"
                  >
                    <Shield className="w-5 h-5" />
                    Admin Panel
                  </Button>
                </Link>
              )}

              <Button variant="destructive" className="mt-2 gap-2" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Odhlásit se
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
