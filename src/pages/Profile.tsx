import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star, Trophy, FileText, MessageCircle, Edit2, Save, X, Mail, Send, Crown, Coins, Trash2, UserPlus, Key, Eye, EyeOff, ShoppingBag, AlertTriangle, Copy, Settings, History, Bell, Lock, Download, Ban, Flag, ClipboardList, UserCheck, RefreshCw, BarChart3 } from 'lucide-react';
import UserBadge, { getRoleDisplayName, getRoleBadgeColor } from '@/components/UserBadge';
import { LvZJContent } from '@/lib/lvzj-parser';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  points: number;
  created_at: string;
  avatar_url: string | null;
}

interface UserStats {
  articlesCount: number;
  ratingsGiven: number;
  gamesParticipated: number;
  gamesWon: number;
  purchasesCount: number;
  messagesCount: number;
}

interface Article {
  id: string;
  title: string;
  status: string;
  points_awarded: number;
  created_at: string;
}

// Crown component for the profile header
const CrownIcon = ({ color }: { color: 'orange' | 'pink' }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-8 h-8 ${color === 'orange' ? 'text-primary' : 'text-pink-400'}`}
    fill="currentColor"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
  </svg>
);

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [viewerRoles, setViewerRoles] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>({ 
    articlesCount: 0, ratingsGiven: 0, gamesParticipated: 0, 
    gamesWon: 0, purchasesCount: 0, messagesCount: 0 
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Owner functions state
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Organizer functions state
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const [addPointsOpen, setAddPointsOpen] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [addingPoints, setAddingPoints] = useState(false);
  
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);
  
  // New owner states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [exportingData, setExportingData] = useState(false);
  
  // New organizer states
  const [showUserPurchases, setShowUserPurchases] = useState(false);
  const [userPurchases, setUserPurchases] = useState<any[]>([]);
  const [showUserMessages, setShowUserMessages] = useState(false);
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [resetPointsOpen, setResetPointsOpen] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const isOwnProfile = user && profile && user.id === profile.id;
  const isOrganizer = viewerRoles.includes('organizer') || viewerRoles.includes('helper');

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
    if (user) {
      fetchViewerRoles();
    }
  }, [username, user]);

  const fetchViewerRoles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    setViewerRoles(data?.map(r => r.role) || []);
  };

  const fetchProfile = async () => {
    setLoading(true);
    setNotFound(false);

    // Get profile by username
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const profileWithBio = {
      ...profileData,
      bio: (profileData as any).bio || null
    } as ProfileData;
    setProfile(profileWithBio);
    setEditBio(profileWithBio.bio || '');

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profileData.id);

    setRoles(rolesData?.map(r => r.role) || []);

    // Fetch extended stats
    const [articlesRes, ratingsRes, tipsRes, winsRes, purchasesRes, messagesRes] = await Promise.all([
      supabase.from('articles').select('id, title, status, points_awarded, created_at').eq('author_id', profileData.id).order('created_at', { ascending: false }),
      supabase.from('article_ratings').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('guessing_tips').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('guessing_tips').select('id', { count: 'exact' }).eq('user_id', profileData.id).eq('is_winner', true),
      supabase.from('purchases').select('id', { count: 'exact' }).eq('user_id', profileData.id),
      supabase.from('messages').select('id', { count: 'exact' }).eq('recipient_id', profileData.id),
    ]);

    setArticles((articlesRes.data || []) as Article[]);
    setStats({
      articlesCount: articlesRes.data?.length || 0,
      ratingsGiven: ratingsRes.count || 0,
      gamesParticipated: tipsRes.count || 0,
      gamesWon: winsRes.count || 0,
      purchasesCount: purchasesRes.count || 0,
      messagesCount: messagesRes.count || 0,
    });

    setLoading(false);
  };

  // ============ OWNER FUNCTIONS (6) ============
  
  // 1. Edit bio
  const handleSaveBio = async () => {
    if (!profile || !isOwnProfile) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio: editBio } as any)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, bio: editBio });
      setIsEditing(false);
      toast.success('Bio uloženo!');
    } else {
      toast.error('Chyba při ukládání');
    }
    setSaving(false);
  };

  // 2. Preview bio (toggle)
  // Already handled by showPreview state

  // 3. View own articles
  // Already shown in stats section

  // 4. View statistics
  // Already shown in stats section

  // 5. Copy profile link
  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Odkaz na profil zkopírován!');
  };

  // 6. Request data deletion
  const handleRequestDeletion = async () => {
    if (!profile || !isOwnProfile) return;
    
    const { error } = await supabase.from('deletion_requests').insert({
      user_id: profile.id,
      reason: 'Žádost o smazání účtu z profilu'
    });
    
    if (!error) {
      toast.success('Žádost o smazání údajů odeslána');
    } else {
      toast.error('Chyba při odesílání žádosti');
    }
  };

  // 7. Export personal data
  const handleExportData = async () => {
    if (!profile || !isOwnProfile) return;
    setExportingData(true);
    
    const [articlesRes, ratingsRes, tipsRes, purchasesRes, messagesRes] = await Promise.all([
      supabase.from('articles').select('*').eq('author_id', profile.id),
      supabase.from('article_ratings').select('*').eq('user_id', profile.id),
      supabase.from('guessing_tips').select('*').eq('user_id', profile.id),
      supabase.from('purchases').select('*').eq('user_id', profile.id),
      supabase.from('messages').select('*').eq('recipient_id', profile.id),
    ]);
    
    const exportData = {
      profile: { username: profile.username, points: profile.points, bio: profile.bio, created_at: profile.created_at },
      articles: articlesRes.data || [],
      ratings: ratingsRes.data || [],
      tips: tipsRes.data || [],
      purchases: purchasesRes.data || [],
      messages: messagesRes.data || [],
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lopik-data-${profile.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Data exportována');
    setExportingData(false);
  };

  // LvZJ documentation - removed (page no longer exists)
  // Users can check the LvZJ syntax by looking at examples on the site
  // 9. Toggle email notifications (placeholder)
  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast.success(notificationsEnabled ? 'Upozornění vypnuta' : 'Upozornění zapnuta');
  };

  // 10. Avatar upload
  // Avatar is now automatically loaded from Alík.cz based on username
  // No manual upload functionality needed
  const getAvatarUrl = (username: string) => `https://www.alik.cz/-/avatar/${encodeURIComponent(username)}`;

  // 10. View profile in new tab
  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // ============ ORGANIZER FUNCTIONS (8) ============
  
  // 1. Send message to user
  const handleSendMessage = async () => {
    if (!profile || !messageSubject.trim() || !messageContent.trim()) {
      toast.error('Vyplňte předmět a obsah zprávy');
      return;
    }

    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: profile.id,
      subject: messageSubject.trim(),
      content: messageContent.trim(),
    });

    if (!error) {
      toast.success('Zpráva odeslána');
      setSendMessageOpen(false);
      setMessageSubject('');
      setMessageContent('');
    } else {
      toast.error('Chyba při odesílání zprávy');
    }
    setSendingMessage(false);
  };

  // 2. Add/remove points (using atomic RPC)
  const handleAddPoints = async () => {
    if (!profile) return;
    const points = parseInt(pointsToAdd);
    if (isNaN(points)) {
      toast.error('Zadejte platný počet bodů');
      return;
    }

    setAddingPoints(true);
    
    // Try atomic RPC first
    // Type assertion needed because RPC function may not be in types yet
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('update_points', {
      _user_id: profile.id,
      _amount: points
    });

    let success = false;
    let newPoints = profile.points + points;

    if (rpcError && (rpcError.message.includes('function') || rpcError.code === '42883')) {
      // Fallback to legacy method if RPC doesn't exist
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', profile.id)
        .single();
      
      if (freshProfile) {
        newPoints = freshProfile.points + points;
        if (newPoints < 0) {
          toast.error('Body nemohou jít do mínusu');
          setAddingPoints(false);
          return;
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', profile.id);
        
        success = !error;
      }
    } else if (!rpcError) {
      const result = rpcResult?.[0];
      success = result?.success ?? false;
      newPoints = result?.new_points ?? newPoints;
      
      if (!success) {
        toast.error('Body nemohou jít do mínusu');
        setAddingPoints(false);
        return;
      }
    }

    if (success || (!rpcError && rpcResult)) {
      // Send notification message
      if (pointsReason.trim()) {
        await supabase.from('messages').insert({
          sender_id: user?.id,
          recipient_id: profile.id,
          subject: points > 0 ? `Získal/a jsi ${points} bodů!` : `Ztratil/a jsi ${Math.abs(points)} bodů`,
          content: pointsReason.trim(),
        });
      }
      
      setProfile({ ...profile, points: newPoints });
      toast.success(points > 0 ? `Přidáno ${points} bodů` : `Odebráno ${Math.abs(points)} bodů`);
      setAddPointsOpen(false);
      setPointsToAdd('');
      setPointsReason('');
    } else {
      toast.error('Chyba při změně bodů');
    }
    setAddingPoints(false);
  };

  // 3. Change user role
  const handleChangeRole = async () => {
    if (!profile || !newRole) return;

    setChangingRole(true);
    
    // Check if role already exists
    const existingRole = roles.find(r => r === newRole);
    if (existingRole) {
      // Remove role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.id)
        .eq('role', newRole as any);
      
      if (!error) {
        setRoles(roles.filter(r => r !== newRole));
        toast.success(`Role ${getRoleDisplayName(newRole)} odebrána`);
      }
    } else {
      // Add role
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: profile.id, role: newRole as any }]);
      
      if (!error) {
        setRoles([...roles, newRole]);
        toast.success(`Role ${getRoleDisplayName(newRole)} přidána`);
      }
    }
    
    setChangingRole(false);
    setChangeRoleOpen(false);
    setNewRole('');
  };

  // 4. View user's purchases
  const handleViewUserPurchases = async () => {
    if (!profile) return;
    setLoadingPurchases(true);
    setShowUserPurchases(true);
    
    const { data } = await supabase
      .from('purchases')
      .select('*, shop_items(name)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    setUserPurchases(data || []);
    setLoadingPurchases(false);
  };

  // 5. View user's messages
  const handleViewUserMessages = async () => {
    if (!profile) return;
    setLoadingMessages(true);
    setShowUserMessages(true);
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    setUserMessages(data || []);
    setLoadingMessages(false);
  };

  // 6. Reset user points
  const handleResetPoints = async () => {
    if (!profile) return;
    setAddingPoints(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ points: 0 })
      .eq('id', profile.id);
    
    if (!error) {
      setProfile({ ...profile, points: 0 });
      toast.success('Body vynulovány');
      setResetPointsOpen(false);
    } else {
      toast.error('Chyba při nulování bodů');
    }
    setAddingPoints(false);
  };

  // 7. Send warning message
  const handleSendWarning = async () => {
    if (!profile || !banReason.trim()) {
      toast.error('Vyplňte důvod varování');
      return;
    }
    
    const { error } = await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: profile.id,
      subject: '⚠️ Varování od organizátora',
      content: banReason.trim(),
    });
    
    if (!error) {
      toast.success('Varování odesláno');
      setShowBanDialog(false);
      setBanReason('');
    } else {
      toast.error('Chyba při odesílání');
    }
  };

  // 8. Copy user ID
  const handleCopyUserId = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.id);
    toast.success('ID uživatele zkopírováno');
  };

  // 9. View user activity summary
  const handleViewActivity = () => {
    toast.info(`Aktivita: ${stats.articlesCount} článků, ${stats.gamesParticipated} tipů, ${stats.purchasesCount} nákupů`);
  };

  // 10-12. Additional org functions are in buttons

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-12">
            <h2 className="text-2xl font-display font-bold mb-2">Uživatel nenalezen</h2>
            <p className="text-muted-foreground">Uživatel @{username} neexistuje.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const isProfileOrganizer = roles.includes('organizer');
  const isProfileHelper = roles.includes('helper');

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Avatar - automatically loaded from Alík.cz */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl font-display font-bold text-primary overflow-hidden">
                  <img 
                    src={getAvatarUrl(profile.username)} 
                    alt={profile.username} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to first letter if avatar fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = profile.username.charAt(0).toUpperCase();
                    }}
                  />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                    @{profile.username}
                    {isProfileOrganizer && <CrownIcon color="orange" />}
                    {isProfileHelper && !isProfileOrganizer && <CrownIcon color="pink" />}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {roles.filter(r => r !== 'user').map(role => (
                    <Badge key={role} className={getRoleBadgeColor(role)}>
                      {getRoleDisplayName(role)}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">{profile.points}</span> bodů
                  </span>
                  <span>
                    Registrován/a {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner actions - 10 functions */}
            {isOwnProfile && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {/* 1. Copy profile link */}
                <Button variant="outline" size="sm" onClick={handleCopyProfileLink}>
                  <Copy className="w-4 h-4 mr-1" />
                  Kopírovat odkaz
                </Button>
                
                {/* 2. Export personal data */}
                <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportingData}>
                  {exportingData ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  Export dat
                </Button>
                
                {/* 3. Toggle notifications */}
                <Button 
                  variant={notificationsEnabled ? "outline" : "secondary"} 
                  size="sm" 
                  onClick={handleToggleNotifications}
                >
                  {notificationsEnabled ? <Bell className="w-4 h-4 mr-1" /> : <Bell className="w-4 h-4 mr-1 opacity-50" />}
                  {notificationsEnabled ? 'Upozornění zap.' : 'Upozornění vyp.'}
                </Button>
                
                {/* 5. Open in new tab */}
                <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                  <Eye className="w-4 h-4 mr-1" />
                  Nová karta
                </Button>
                
                {/* 6. Request data deletion */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Žádost o smazání
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Smazat účet
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                      Opravdu chceš požádat o smazání svého účtu? Organizátor zkontroluje žádost a po schválení budou všechna tvá data smazána.
                    </p>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleRequestDeletion}>
                        Odeslat žádost
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Organizer actions */}
            {isOrganizer && !isOwnProfile && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                <Dialog open={sendMessageOpen} onOpenChange={setSendMessageOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-1" />
                      Odeslat zprávu
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Odeslat zprávu @{profile.username}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Předmět</Label>
                        <Input 
                          value={messageSubject} 
                          onChange={(e) => setMessageSubject(e.target.value)}
                          placeholder="Předmět zprávy..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Obsah</Label>
                        <Textarea 
                          value={messageContent} 
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Obsah zprávy..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendMessage} disabled={sendingMessage}>
                        {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                        Odeslat
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={addPointsOpen} onOpenChange={setAddPointsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Coins className="w-4 h-4 mr-1" />
                      Upravit body
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upravit body @{profile.username}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Aktuální stav: <span className="font-bold text-foreground">{profile.points}</span> bodů
                      </p>
                      <div className="space-y-2">
                        <Label>Počet bodů (záporné číslo odebere)</Label>
                        <Input 
                          type="number"
                          value={pointsToAdd} 
                          onChange={(e) => setPointsToAdd(e.target.value)}
                          placeholder="např. 10 nebo -5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Důvod (bude odeslán jako zpráva)</Label>
                        <Textarea 
                          value={pointsReason} 
                          onChange={(e) => setPointsReason(e.target.value)}
                          placeholder="Volitelný důvod..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddPoints} disabled={addingPoints}>
                        {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Coins className="w-4 h-4 mr-1" />}
                        Uložit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Crown className="w-4 h-4 mr-1" />
                      Změnit roli
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Změnit roli @{profile.username}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block">Aktuální role:</Label>
                        <div className="flex flex-wrap gap-2">
                          {roles.map(role => (
                            <Badge key={role} className={getRoleBadgeColor(role)}>
                              {getRoleDisplayName(role)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Přidat/odebrat roli</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyber roli..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="helper">
                              {roles.includes('helper') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              Pomocníček
                            </SelectItem>
                            <SelectItem value="organizer">
                              {roles.includes('organizer') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              Organizátor
                            </SelectItem>
                            <SelectItem value="alik_admin">
                              {roles.includes('alik_admin') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🔵 Zvěrolékař Alíka
                            </SelectItem>
                            <SelectItem value="alik_helper">
                              {roles.includes('alik_helper') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🟢 Správce Alíka
                            </SelectItem>
                            <SelectItem value="alik_editor">
                              {roles.includes('alik_editor') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🔴 Redaktor Alíka
                            </SelectItem>
                            <SelectItem value="alik_club_manager">
                              {roles.includes('alik_club_manager') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🔴 Správce klubovny
                            </SelectItem>
                            <SelectItem value="alik_board_manager">
                              {roles.includes('alik_board_manager') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🔴 Správce nástěnek
                            </SelectItem>
                            <SelectItem value="alik_jester">
                              {roles.includes('alik_jester') ? '❌ Odebrat: ' : '✓ Přidat: '}
                              🃏 Alíkův šašek
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleChangeRole} disabled={changingRole || !newRole}>
                        {changingRole ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Crown className="w-4 h-4 mr-1" />}
                        {newRole && roles.includes(newRole) ? 'Odebrat roli' : 'Přidat roli'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 4. View user purchases */}
                <Dialog open={showUserPurchases} onOpenChange={setShowUserPurchases}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleViewUserPurchases}>
                      <ShoppingBag className="w-4 h-4 mr-1" />
                      Nákupy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nákupy @{profile.username}</DialogTitle>
                    </DialogHeader>
                    {loadingPurchases ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : userPurchases.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Žádné nákupy</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userPurchases.map(p => (
                          <div key={p.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span>{(p.shop_items as any)?.name || 'Neznámá položka'}</span>
                            <div className="flex gap-2 items-center">
                              <Badge variant="secondary">{p.total_price} b.</Badge>
                              <Badge>{p.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* 5. View user messages */}
                <Dialog open={showUserMessages} onOpenChange={setShowUserMessages}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleViewUserMessages}>
                      <Mail className="w-4 h-4 mr-1" />
                      Zprávy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Zprávy @{profile.username}</DialogTitle>
                    </DialogHeader>
                    {loadingMessages ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : userMessages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Žádné zprávy</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userMessages.map(m => (
                          <div key={m.id} className="p-2 bg-muted/50 rounded">
                            <div className="font-medium text-sm">{m.subject}</div>
                            <div className="text-xs text-muted-foreground truncate">{m.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* 6. Reset points */}
                <Dialog open={resetPointsOpen} onOpenChange={setResetPointsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reset bodů
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vynulovat body @{profile.username}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">Aktuální stav: {profile.points} bodů. Body budou nastaveny na 0.</p>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleResetPoints} disabled={addingPoints}>
                        {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Vynulovat
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 7. Send warning */}
                <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-yellow-600">
                      <Flag className="w-4 h-4 mr-1" />
                      Varování
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Odeslat varování @{profile.username}</DialogTitle>
                    </DialogHeader>
                    <Textarea 
                      value={banReason} 
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Důvod varování..."
                      rows={3}
                    />
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleSendWarning}>
                        <Flag className="w-4 h-4 mr-1" />
                        Odeslat varování
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 8. Copy user ID */}
                <Button variant="outline" size="sm" onClick={handleCopyUserId}>
                  <ClipboardList className="w-4 h-4 mr-1" />
                  ID
                </Button>

                {/* 9. View activity summary */}
                <Button variant="outline" size="sm" onClick={handleViewActivity}>
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Aktivita
                </Button>

                {/* 10. Admin panel */}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Admin
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bio Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">O mně</CardTitle>
              {isOwnProfile && !isEditing && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Upravit
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2 mb-2">
                  <Button 
                    variant={!showPreview ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Psát
                  </Button>
                  <Button 
                    variant={showPreview ? "secondary" : "ghost"} 
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Náhled
                  </Button>
                </div>
                
                {showPreview ? (
                  <div className="p-4 bg-muted/50 rounded-lg min-h-[100px]">
                    {editBio ? <LvZJContent content={editBio} /> : <span className="text-muted-foreground italic">Prázdné bio</span>}
                  </div>
                ) : (
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Napiš něco o sobě... Můžeš použít LvZJ formátování!"
                    rows={4}
                  />
                )}
                
                <p className="text-xs text-muted-foreground">
                  Tip: Použij LvZJ formátování: (tučně), (kurzívou), (červeně), (spoiler)text(konec) atd.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSaveBio} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Uložit
                  </Button>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setEditBio(profile.bio || ''); setShowPreview(false); }}>
                    <X className="w-4 h-4 mr-1" />
                    Zrušit
                  </Button>
                </div>
              </div>
            ) : profile.bio ? (
              <LvZJContent content={profile.bio} />
            ) : (
              <p className="text-muted-foreground italic">
                {isOwnProfile ? 'Zatím jsi o sobě nic nenapsal/a.' : 'Tento uživatel o sobě zatím nic nenapsal.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats & Activity Tabs */}
        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stats">Statistiky</TabsTrigger>
            <TabsTrigger value="articles">Články ({stats.articlesCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.articlesCount}</div>
                    <div className="text-xs text-muted-foreground">Článků</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <div className="text-2xl font-bold">{stats.ratingsGiven}</div>
                    <div className="text-xs text-muted-foreground">Hodnocení</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 text-accent" />
                    <div className="text-2xl font-bold">{stats.gamesParticipated}</div>
                    <div className="text-xs text-muted-foreground">Tipovačky</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.gamesWon}</div>
                    <div className="text-xs text-muted-foreground">Výhry</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{stats.purchasesCount}</div>
                    <div className="text-xs text-muted-foreground">Nákupy</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Mail className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{stats.messagesCount}</div>
                    <div className="text-xs text-muted-foreground">Zprávy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles">
            <Card>
              <CardContent className="pt-6">
                {articles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žádné články</p>
                ) : (
                  <div className="space-y-2">
                    {articles.map(article => {
                      const statusColors: Record<string, string> = {
                        pending: 'bg-yellow-500',
                        approved: 'bg-blue-500',
                        rejected: 'bg-destructive',
                        rated: 'bg-accent',
                        published: 'bg-green-500'
                      };
                      return (
                        <div key={article.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge className={statusColors[article.status] || 'bg-muted'}>
                              {article.status}
                            </Badge>
                            <span className="font-medium">{article.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {article.points_awarded > 0 && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                +{article.points_awarded}
                              </Badge>
                            )}
                            <span>{new Date(article.created_at).toLocaleDateString('cs-CZ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
