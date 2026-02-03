import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { calculateRatingStats, getRatingQuality } from '@/lib/points';
import RatingDisplay from '@/components/RatingDisplay';
import UserBadge, { getRoleDisplayName, getRoleBadgeColor } from '@/components/UserBadge';
import SendMessage from '@/components/SendMessage';
import { FileText, CheckCircle, XCircle, Star, Loader2, Coins, Clock, AlertTriangle, Sparkles, TrendingUp, HelpCircle, Plus, Image as ImageIcon, Trophy, Users, Trash2, UserPlus, Crown, Edit, Mail, Send, ShoppingBag, Package, ToggleLeft, ToggleRight, Award, BookOpen, Download, RefreshCw, BarChart3, Ban, Lock, Music, Settings2, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SecurityLogs from '@/components/SecurityLogs';
import { Switch } from '@/components/ui/switch';
import { Navigate } from 'react-router-dom';
interface Article {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'rated' | 'published';
  points_awarded: number;
  created_at: string;
  author_id: string;
  author_username?: string;
  article_ratings?: {
    rating: number;
    user_id: string;
  }[];
}
interface GuessingGame {
  id: string;
  title: string;
  question: string;
  image_url: string | null;
  status: 'active' | 'closed' | 'resolved';
  correct_answer: string | null;
  winner_id: string | null;
  points_awarded: number;
  created_at: string;
  tips?: {
    id: string;
    tip: string;
    user_id: string;
    is_winner: boolean;
    username?: string;
  }[];
}
interface UserProfile {
  id: string;
  username: string;
  points: number;
  roles: string[];
  for_fun: boolean;
}
interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
}
interface Purchase {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  username?: string;
  item_name?: string;
}
interface DeletionRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  username?: string;
}
export default function Admin() {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [games, setGames] = useState<GuessingGame[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsToAward, setPointsToAward] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedArticleForPublish, setSelectedArticleForPublish] = useState<Article | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  // Article editing
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');

  // Message when publishing
  const [publishMessage, setPublishMessage] = useState('');

  // New game form
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    title: '',
    question: '',
    imageFile: null as File | null
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Resolve game
  const [selectedGameForResolve, setSelectedGameForResolve] = useState<GuessingGame | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [gamePoints, setGamePoints] = useState('10');

  // Role management
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  // Shop management
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    stock: ''
  });
  const [itemToEdit, setItemToEdit] = useState<ShopItem | null>(null);
  const [editedItem, setEditedItem] = useState({
    name: '',
    description: '',
    price: '',
    stock: ''
  });

  // Deletion requests
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [requestToProcess, setRequestToProcess] = useState<DeletionRequest | null>(null);
  
  // LvZJ command restrictions
  const [lvzjRestrictions, setLvzjRestrictions] = useState<{id: string; command_name: string; allowed_roles: string[]; description: string | null; is_active: boolean}[]>([
    { id: '1', command_name: 'melodie', allowed_roles: ['hudebnik'], description: 'Vkládání hudby (YouTube, Spotify)', is_active: true },
    { id: '2', command_name: 'playlist', allowed_roles: ['hudebnik'], description: 'Vytváření playlistů', is_active: true },
  ]);
  const [newRestrictionOpen, setNewRestrictionOpen] = useState(false);
  const [newRestriction, setNewRestriction] = useState({ command_name: '', allowed_roles: [] as string[], description: '' });
  const [editingRestriction, setEditingRestriction] = useState<{id: string; command_name: string; allowed_roles: string[]; description: string | null; is_active: boolean} | null>(null);
  
  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<{id: string; user_id: string; username?: string; reason: string | null; blocked_at: string; is_active: boolean}[]>([]);
  const [blockUserOpen, setBlockUserOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // New admin functions
  const [exportingStats, setExportingStats] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [siteStatsOpen, setSiteStatsOpen] = useState(false);
  
  // Gift item to user
  const [giftItemOpen, setGiftItemOpen] = useState(false);
  const [giftTargetUser, setGiftTargetUser] = useState<UserProfile | null>(null);
  const [giftItem, setGiftItem] = useState<ShopItem | null>(null);
  const [giftQuantity, setGiftQuantity] = useState('1');
  const [giftReason, setGiftReason] = useState('');
  const [giftingItem, setGiftingItem] = useState(false);
  
  // Create user (admin)
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  useEffect(() => {
    if (user) {
      checkRole();
    }
  }, [user]);
  const checkRole = async () => {
    setCheckingRole(true);
    const {
      data
    } = await supabase.from('user_roles').select('role').eq('user_id', user?.id);
    const hasOrgRole = data?.some(r => r.role === 'organizer' || r.role === 'helper');
    setIsOrganizer(hasOrgRole || false);
    if (hasOrgRole) {
      fetchData();
    }
    setCheckingRole(false);
  };
  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchArticles(), fetchGames(), fetchUsers(), fetchShopData(), fetchDeletionRequests()]);
    setLoading(false);
  };
  const fetchArticles = async () => {
    const {
      data: allArticles
    } = await supabase.from('articles').select(`*, article_ratings(rating, user_id)`).order('created_at', {
      ascending: false
    });
    const authorIds = [...new Set((allArticles || []).map(a => a.author_id))];
    const {
      data: profiles
    } = await supabase.from('profiles').select('id, username').in('id', authorIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    const mappedArticles = (allArticles || []).map(a => ({
      ...a,
      author_username: profileMap.get(a.author_id) || 'Neznámý'
    })) as Article[];
    setArticles(mappedArticles);
  };
  const fetchGames = async () => {
    const {
      data: gamesData
    } = await supabase.from('guessing_games').select('*').order('created_at', {
      ascending: false
    });
    if (!gamesData) {
      setGames([]);
      return;
    }

    // Fetch tips for all games
    const gameIds = gamesData.map(g => g.id);
    const {
      data: tipsData
    } = await supabase.from('guessing_tips').select('*').in('game_id', gameIds);

    // Fetch usernames for tip authors
    const tipUserIds = [...new Set((tipsData || []).map(t => t.user_id))];
    const {
      data: profiles
    } = await supabase.from('profiles').select('id, username').in('id', tipUserIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    const mappedGames = gamesData.map(game => ({
      ...game,
      tips: (tipsData || []).filter(t => t.game_id === game.id).map(t => ({
        ...t,
        username: profileMap.get(t.user_id) || 'Neznámý'
      }))
    })) as GuessingGame[];
    setGames(mappedGames);
  };
  const fetchUsers = async () => {
    const {
      data: profilesData
    } = await supabase.from('profiles').select('id, username, points').order('username');
    const {
      data: rolesData
    } = await supabase.from('user_roles').select('user_id, role');
    const mappedUsers = (profilesData || []).map(p => ({
      ...p,
      for_fun: (p as any).for_fun ?? false,
      roles: (rolesData || []).filter(r => r.user_id === p.id).map(r => r.role)
    })) as UserProfile[];
    setUsers(mappedUsers);
  };
  const fetchShopData = async () => {
    const {
      data: itemsData
    } = await supabase.from('shop_items').select('*').order('created_at', {
      ascending: false
    });
    setShopItems(itemsData || []);
    const {
      data: purchasesData
    } = await supabase.from('purchases').select('*').order('created_at', {
      ascending: false
    });
    if (purchasesData) {
      const userIds = [...new Set(purchasesData.map(p => p.user_id))];
      const {
        data: profiles
      } = await supabase.from('profiles').select('id, username').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      const mappedPurchases = purchasesData.map(p => ({
        ...p,
        username: profileMap.get(p.user_id) || 'Neznámý',
        item_name: itemsData?.find(i => i.id === p.item_id)?.name || 'Neznámý'
      }));
      setPurchases(mappedPurchases);
    }
  };
  const fetchDeletionRequests = async () => {
    const { data: requestsData } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (requestsData && requestsData.length > 0) {
      const userIds = [...new Set(requestsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      const mapped = requestsData.map(r => ({
        ...r,
        username: profileMap.get(r.user_id) || 'Neznámý'
      }));
      setDeletionRequests(mapped);
    } else {
      setDeletionRequests([]);
    }
  };

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    try {
      const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/blocked_users?is_active=eq.true`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });
      if (result.ok) {
        const data = await result.json();
        if (Array.isArray(data) && data.length > 0) {
          const userIds = [...new Set(data.map((b: any) => b.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
          setBlockedUsers(data.map((b: any) => ({ ...b, username: profileMap.get(b.user_id) || 'Neznámý' })));
        }
      }
    } catch (e) {
      // Table might not exist
    }
  };

  // Block user
  const handleBlockUser = async () => {
    if (!userToBlock) return;
    setProcessing(true);
    
    try {
      const session = await supabase.auth.getSession();
      const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/blocked_users`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: userToBlock.id,
          blocked_by: user?.id,
          reason: blockReason || null,
        })
      });
      
      if (result.ok) {
        toast.success(`Uživatel @${userToBlock.username} zablokován`);
        // Send message to user
        await supabase.from('messages').insert({
          sender_id: user?.id,
          recipient_id: userToBlock.id,
          subject: '🚫 Účet zablokován',
          content: `Tvůj účet byl zablokován organizátorem.${blockReason ? `\n\nDůvod: ${blockReason}` : ''}`
        });
        fetchBlockedUsers();
      } else {
        toast.error('Chyba při blokování uživatele');
      }
    } catch (e) {
      toast.error('Chyba při blokování uživatele');
    }
    
    setBlockUserOpen(false);
    setUserToBlock(null);
    setBlockReason('');
    setProcessing(false);
  };

  // Unblock user
  const handleUnblockUser = async (blockId: string, userId: string) => {
    setProcessing(true);
    
    try {
      const session = await supabase.auth.getSession();
      const result = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/blocked_users?id=eq.${blockId}`, {
        method: 'PATCH',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false, unblocked_at: new Date().toISOString() })
      });
      
      if (result.ok) {
        toast.success('Uživatel odblokován');
        setBlockedUsers(blockedUsers.filter(b => b.id !== blockId));
      } else {
        toast.error('Chyba při odblokování');
      }
    } catch (e) {
      toast.error('Chyba při odblokování');
    }
    
    setProcessing(false);
  };

  // Update LvZJ restriction
  const handleUpdateRestriction = (id: string, allowedRoles: string[]) => {
    setLvzjRestrictions(prev => prev.map(r => 
      r.id === id ? { ...r, allowed_roles: allowedRoles } : r
    ));
    toast.success('Omezení aktualizováno');
  };

  // Add new LvZJ restriction
  const handleAddRestriction = () => {
    if (!newRestriction.command_name.trim()) {
      toast.error('Zadej název příkazu');
      return;
    }
    
    const newId = (lvzjRestrictions.length + 1).toString();
    setLvzjRestrictions([...lvzjRestrictions, {
      id: newId,
      command_name: newRestriction.command_name.toLowerCase().trim(),
      allowed_roles: newRestriction.allowed_roles,
      description: newRestriction.description || null,
      is_active: true
    }]);
    
    setNewRestriction({ command_name: '', allowed_roles: [], description: '' });
    setNewRestrictionOpen(false);
    toast.success('Omezení přidáno');
  };

  // Remove LvZJ restriction
  const handleRemoveRestriction = (id: string) => {
    setLvzjRestrictions(prev => prev.filter(r => r.id !== id));
    toast.success('Omezení odstraněno');
  };

  // Create user (admin)
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newUserPassword.trim()) {
      toast.error('Vyplň přezdívku a heslo');
      return;
    }

    if (newUsername.length < 2 || newUsername.length > 30) {
      toast.error('Přezdívka musí mít 2-30 znaků');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }

    setCreatingUser(true);

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: newUsername.trim(),
            password: newUserPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nepodařilo se vytvořit uživatele');
      }

      toast.success(`Uživatel @${newUsername} vytvořen! Email: ${data.email}`);
      setCreateUserOpen(false);
      setNewUsername('');
      setNewUserPassword('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Nepodařilo se vytvořit uživatele');
    } finally {
      setCreatingUser(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserPassword(password);
  };
  const handleApproveDeletion = async () => {
    if (!requestToProcess) return;
    setProcessing(true);
    
    const userId = requestToProcess.user_id;
    
    // Delete user's articles
    await supabase.from('articles').delete().eq('author_id', userId);
    
    // Delete user's tips
    await supabase.from('guessing_tips').delete().eq('user_id', userId);
    
    // Delete user's ratings
    await supabase.from('article_ratings').delete().eq('user_id', userId);
    
    // Delete user's messages
    await supabase.from('messages').delete().eq('recipient_id', userId);
    await supabase.from('messages').delete().eq('sender_id', userId);
    
    // Delete user's purchases
    await supabase.from('purchases').delete().eq('user_id', userId);
    
    // Delete user's roles (except basic)
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    // Reset user's profile to anonymous
    await supabase.from('profiles').update({
      username: 'smazany_uzivatel_' + userId.slice(0, 8),
      points: 0,
      avatar_url: null
    }).eq('id', userId);
    
    // Update request status
    await supabase.from('deletion_requests').update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id
    }).eq('id', requestToProcess.id);
    
    toast.success('Údaje uživatele byly smazány');
    setRequestToProcess(null);
    fetchDeletionRequests();
    fetchUsers();
    setProcessing(false);
  };
  const handleRejectDeletion = async () => {
    if (!requestToProcess) return;
    setProcessing(true);
    
    await supabase.from('deletion_requests').update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id
    }).eq('id', requestToProcess.id);
    
    // Send message to user
    await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: requestToProcess.user_id,
      subject: 'Žádost o smazání údajů zamítnuta',
      content: 'Vaše žádost o smazání osobních údajů byla zamítnuta. Pokud máte dotazy, kontaktujte organizátory.'
    });
    
    toast.success('Žádost zamítnuta');
    setRequestToProcess(null);
    fetchDeletionRequests();
    setProcessing(false);
  };
  const handleCreateShopItem = async () => {
    if (!newItem.name.trim()) {
      toast.error('Vyplň název položky');
      return;
    }
    const price = parseInt(newItem.price);
    if (isNaN(price) || price < 0) {
      toast.error('Zadej platnou cenu');
      return;
    }
    setProcessing(true);
    const {
      error
    } = await supabase.from('shop_items').insert({
      name: newItem.name.trim(),
      description: newItem.description.trim() || null,
      price,
      stock: newItem.stock ? parseInt(newItem.stock) : null
    });
    if (error) {
      toast.error('Chyba při vytváření položky');
    } else {
      toast.success('Položka vytvořena');
      setNewItem({
        name: '',
        description: '',
        price: '',
        stock: ''
      });
      setNewItemDialogOpen(false);
      fetchShopData();
    }
    setProcessing(false);
  };
  const handleUpdateShopItem = async () => {
    if (!itemToEdit) return;
    const price = parseInt(editedItem.price);
    if (isNaN(price) || price < 0) {
      toast.error('Zadej platnou cenu');
      return;
    }
    setProcessing(true);
    const {
      error
    } = await supabase.from('shop_items').update({
      name: editedItem.name.trim(),
      description: editedItem.description.trim() || null,
      price,
      stock: editedItem.stock ? parseInt(editedItem.stock) : null
    }).eq('id', itemToEdit.id);
    if (error) {
      toast.error('Chyba při úpravě položky');
    } else {
      toast.success('Položka upravena');
      setItemToEdit(null);
      fetchShopData();
    }
    setProcessing(false);
  };
  const handleToggleItemActive = async (item: ShopItem) => {
    const {
      error
    } = await supabase.from('shop_items').update({
      is_active: !item.is_active
    }).eq('id', item.id);
    if (error) {
      toast.error('Chyba při změně stavu');
    } else {
      toast.success(item.is_active ? 'Položka skryta' : 'Položka aktivována');
      fetchShopData();
    }
  };
  const handleDeleteShopItem = async (itemId: string) => {
    const {
      error
    } = await supabase.from('shop_items').delete().eq('id', itemId);
    if (error) {
      toast.error('Chyba při mazání položky');
    } else {
      toast.success('Položka smazána');
      fetchShopData();
    }
  };
  const handleUpdatePurchaseStatus = async (purchaseId: string, status: string) => {
    const {
      error
    } = await supabase.from('purchases').update({
      status
    }).eq('id', purchaseId);
    if (error) {
      toast.error('Chyba při aktualizaci objednávky');
    } else {
      toast.success('Objednávka aktualizována');
      fetchShopData();
    }
  };

  // Gift item to user (adds to inventory as gift)
  const handleGiftItem = async () => {
    if (!giftTargetUser || !giftItem) {
      toast.error('Vyber uživatele a předmět');
      return;
    }
    const quantity = parseInt(giftQuantity) || 1;
    if (quantity < 1) {
      toast.error('Množství musí být alespoň 1');
      return;
    }
    
    setGiftingItem(true);
    
    // Create a "gift" purchase record with status 'delivered'
    const { error } = await supabase.from('purchases').insert({
      user_id: giftTargetUser.id,
      item_id: giftItem.id,
      quantity: quantity,
      total_price: 0, // Gift is free
      status: 'delivered'
    });
    
    if (error) {
      toast.error('Chyba při darování předmětu');
      setGiftingItem(false);
      return;
    }
    
    // Send notification message
    await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: giftTargetUser.id,
      subject: `🎁 Obdržel/a jsi dar: ${giftItem.name}`,
      content: giftReason.trim() || `Byl ti darován předmět "${giftItem.name}" (${quantity}×). Najdeš ho ve svém inventáři!`
    });
    
    toast.success(`Předmět "${giftItem.name}" darován uživateli @${giftTargetUser.username}`);
    setGiftItemOpen(false);
    setGiftTargetUser(null);
    setGiftItem(null);
    setGiftQuantity('1');
    setGiftReason('');
    setGiftingItem(false);
    fetchShopData();
  };

  // Article handlers
  const handleApprove = async (articleId: string) => {
    setProcessing(true);
    const {
      error
    } = await supabase.from('articles').update({
      status: 'approved'
    }).eq('id', articleId);
    if (error) toast.error('Chyba při schvalování');else {
      toast.success('Článek schválen!');
      fetchArticles();
    }
    setProcessing(false);
  };
  const handleReject = async (articleId: string) => {
    setProcessing(true);
    const {
      error
    } = await supabase.from('articles').update({
      status: 'rejected'
    }).eq('id', articleId);
    if (error) toast.error('Chyba při zamítání');else {
      toast.success('Článek zamítnut');
      fetchArticles();
    }
    setProcessing(false);
  };
  const handlePublishWithPoints = async () => {
    if (!selectedArticleForPublish) return;
    const points = parseInt(pointsToAward);
    if (isNaN(points) || points < 0) {
      toast.error('Zadej platný počet bodů');
      return;
    }
    setProcessing(true);
    const {
      error
    } = await supabase.from('articles').update({
      status: 'published',
      points_awarded: points
    }).eq('id', selectedArticleForPublish.id);
    if (error) {
      toast.error('Chyba při publikování');
      setProcessing(false);
      return;
    }
    if (points > 0) {
      // Use atomic RPC function if available, fallback to legacy
      // Type assertion needed because RPC function may not be in types yet
      const { error: rpcError } = await (supabase.rpc as any)('update_points', {
        _user_id: selectedArticleForPublish.author_id,
        _amount: points
      });
      
      if (rpcError && (rpcError.message?.includes('function') || rpcError.code === '42883')) {
        // Fallback: fetch fresh and update
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', selectedArticleForPublish.author_id)
          .single();
        if (profile) {
          await supabase.from('profiles').update({
            points: profile.points + points
          }).eq('id', selectedArticleForPublish.author_id);
        }
      }
    }

    // Send message to author if message is provided
    if (publishMessage.trim()) {
      await supabase.from('messages').insert({
        sender_id: user?.id,
        recipient_id: selectedArticleForPublish.author_id,
        subject: `Tvůj článek "${selectedArticleForPublish.title}" byl obodován`,
        content: publishMessage.trim()
      });
    }
    toast.success(`Článek publikován! +${points} bodů`);
    setSelectedArticleForPublish(null);
    setPointsToAward('');
    setPublishMessage('');
    fetchArticles();
    setProcessing(false);
  };
  const handleEditArticle = async () => {
    if (!articleToEdit) return;
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast.error('Vyplň název i obsah');
      return;
    }
    setProcessing(true);
    const {
      error
    } = await supabase.from('articles').update({
      title: editedTitle.trim(),
      content: editedContent.trim()
    }).eq('id', articleToEdit.id);
    if (error) {
      toast.error('Chyba při úpravě článku');
    } else {
      toast.success('Článek upraven');
      fetchArticles();
    }
    setArticleToEdit(null);
    setEditedTitle('');
    setEditedContent('');
    setProcessing(false);
  };
  const openEditDialog = (article: Article) => {
    setArticleToEdit(article);
    setEditedTitle(article.title);
    setEditedContent(article.content);
  };
  const generatePublishMessage = (points: number, averageRating: number | null) => {
    const percentage = averageRating ? Math.round(averageRating / 10 * 100) : 0;
    return `Ahoj,
tvůj článek byl obodován a získal ${points} bodů. Popularita článku podle hodnocení ostatních dosáhla ${percentage}%. Na základě výsledků ti byla přidělena bodová odměna, která se ti připíše do systému.

Hezký den,
lopi`;
  };
  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;
    setProcessing(true);
    const {
      error
    } = await supabase.from('articles').delete().eq('id', articleToDelete.id);
    if (error) {
      toast.error('Chyba při mazání článku');
    } else {
      toast.success('Článek smazán');
      fetchArticles();
    }
    setArticleToDelete(null);
    setProcessing(false);
  };
  const handleAssignRole = async () => {
    if (!selectedUserForRole || !newRole) return;
    setProcessing(true);

    // Check if user already has this role
    const existingRole = selectedUserForRole.roles.includes(newRole);
    if (existingRole) {
      toast.error('Uživatel již má tuto roli');
      setProcessing(false);
      return;
    }
    const {
      error
    } = await supabase.from('user_roles').insert({
      user_id: selectedUserForRole.id,
      role: newRole
    } as any);
    if (error) {
      toast.error('Chyba při přidělování role');
    } else {
      toast.success(`Role "${newRole}" přidělena uživateli @${selectedUserForRole.username}`);
      fetchUsers();
    }
    setSelectedUserForRole(null);
    setNewRole('');
    setProcessing(false);
  };
  const handleRemoveRole = async (userId: string, role: string) => {
    if (role === 'user') {
      toast.error('Základní roli nelze odebrat');
      return;
    }
    setProcessing(true);
    const {
      error
    } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    if (error) {
      toast.error('Chyba při odebírání role');
    } else {
      toast.success('Role odebrána');
      fetchUsers();
    }
    setProcessing(false);
  };

  // Toggle for_fun flag
  const handleToggleForFun = async (userId: string, currentValue: boolean) => {
    setProcessing(true);
    const { error } = await supabase
      .from('profiles')
      .update({ for_fun: !currentValue } as any)
      .eq('id', userId);
    
    if (error) {
      toast.error('Chyba při změně statusu');
    } else {
      toast.success(!currentValue ? 'Uživatel nastaven jako "jen pro zábavu"' : 'Uživatel nastaven jako soutěžící');
      setUsers(users.map(u => u.id === userId ? { ...u, for_fun: !currentValue } : u));
    }
    setProcessing(false);
  };

  // Game handlers
  const handleCreateGame = async () => {
    if (!newGame.title.trim() || !newGame.question.trim()) {
      toast.error('Vyplň název a otázku');
      return;
    }
    setProcessing(true);
    let imageUrl = null;
    if (newGame.imageFile) {
      setUploadingImage(true);
      const fileName = `${Date.now()}-${newGame.imageFile.name}`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('tipovacky').upload(fileName, newGame.imageFile);
      if (uploadError) {
        toast.error('Chyba při nahrávání obrázku');
        setUploadingImage(false);
        setProcessing(false);
        return;
      }
      const {
        data: urlData
      } = supabase.storage.from('tipovacky').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }
    const {
      error
    } = await supabase.from('guessing_games').insert({
      created_by: user?.id,
      title: newGame.title.trim(),
      question: newGame.question.trim(),
      image_url: imageUrl
    });
    if (error) {
      toast.error('Chyba při vytváření tipovačky');
    } else {
      toast.success('Tipovačka vytvořena!');
      setNewGame({
        title: '',
        question: '',
        imageFile: null
      });
      setNewGameDialogOpen(false);
      fetchGames();
    }
    setProcessing(false);
  };
  const handleResolveGame = async () => {
    if (!selectedGameForResolve || !selectedWinnerId) {
      toast.error('Vyber vítěze');
      return;
    }
    const points = parseInt(gamePoints);
    if (isNaN(points) || points < 0) {
      toast.error('Zadej platný počet bodů');
      return;
    }
    setProcessing(true);

    // Update game
    const {
      error: gameError
    } = await supabase.from('guessing_games').update({
      status: 'resolved',
      correct_answer: correctAnswer.trim() || null,
      winner_id: selectedWinnerId,
      points_awarded: points,
      closed_at: new Date().toISOString()
    }).eq('id', selectedGameForResolve.id);
    if (gameError) {
      toast.error('Chyba při ukončování');
      setProcessing(false);
      return;
    }

    // Mark winner tip
    await supabase.from('guessing_tips').update({
      is_winner: true
    }).eq('game_id', selectedGameForResolve.id).eq('user_id', selectedWinnerId);

    // Award points using atomic RPC
    if (points > 0) {
      // Type assertion needed because RPC function may not be in types yet
      const { error: rpcError } = await (supabase.rpc as any)('update_points', {
        _user_id: selectedWinnerId,
        _amount: points
      });
      
      if (rpcError && (rpcError.message?.includes('function') || rpcError.code === '42883')) {
        // Fallback: fetch fresh and update
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', selectedWinnerId)
          .single();
        if (profile) {
          await supabase.from('profiles').update({
            points: profile.points + points
          }).eq('id', selectedWinnerId);
        }
      }
    }
    toast.success(`Tipovačka ukončena! Vítěz získal ${points} bodů`);
    setSelectedGameForResolve(null);
    setCorrectAnswer('');
    setSelectedWinnerId(null);
    setGamePoints('10');
    fetchGames();
    setProcessing(false);
  };
  const pendingArticles = articles.filter(a => a.status === 'pending');
  const approvedArticles = articles.filter(a => a.status === 'approved' || a.status === 'rated');
  const activeGames = games.filter(g => g.status === 'active');

  // ========== NEW ADMIN FUNCTIONS (5) ==========

  // 1. Export statistics to JSON
  const handleExportStats = async () => {
    setExportingStats(true);
    
    const stats = {
      exportedAt: new Date().toISOString(),
      articles: {
        total: articles.length,
        pending: pendingArticles.length,
        approved: approvedArticles.length,
        published: articles.filter(a => a.status === 'published').length,
        totalPointsAwarded: articles.reduce((s, a) => s + a.points_awarded, 0)
      },
      games: {
        total: games.length,
        active: activeGames.length,
        resolved: games.filter(g => g.status === 'resolved').length,
        totalPointsAwarded: games.filter(g => g.status === 'resolved').reduce((s, g) => s + g.points_awarded, 0)
      },
      users: {
        total: users.length,
        organizers: users.filter(u => u.roles.includes('organizer')).length,
        helpers: users.filter(u => u.roles.includes('helper')).length,
        totalPoints: users.reduce((s, u) => s + u.points, 0)
      },
      shop: {
        items: shopItems.length,
        activeItems: shopItems.filter(i => i.is_active).length,
        purchases: purchases.length,
        pendingPurchases: purchases.filter(p => p.status === 'pending').length
      },
      deletionRequests: deletionRequests.length
    };
    
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lopik-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Statistiky exportovány');
    setExportingStats(false);
  };

  // 2. Broadcast message to all users
  const handleBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      toast.error('Vyplňte předmět a obsah');
      return;
    }
    
    setSendingBroadcast(true);
    
    const messages = users.map(u => ({
      sender_id: user?.id,
      recipient_id: u.id,
      subject: broadcastSubject.trim(),
      content: broadcastContent.trim()
    }));
    
    const { error } = await supabase.from('messages').insert(messages);
    
    if (!error) {
      toast.success(`Zpráva odeslána ${users.length} uživatelům`);
      setBroadcastOpen(false);
      setBroadcastSubject('');
      setBroadcastContent('');
    } else {
      toast.error('Chyba při odesílání');
    }
    setSendingBroadcast(false);
  };

  // 3. Refresh all data
  const handleRefreshData = () => {
    fetchData();
    toast.success('Data aktualizována');
  };

  // 4. Open LvZJ docs
  const handleOpenLvzjDocs = () => {
    window.open('/lvzj', '_blank');
  };

  // 5. View site stats (computed inline below)
  if (authLoading || checkingRole) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isOrganizer) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="max-w-md text-center"><CardContent className="pt-8">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Přístup odepřen</h2>
          <p className="text-muted-foreground">Pouze pro organizátory.</p>
        </CardContent></Card>
      </div>;
  }
  return <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shadow-card">
                <Award className="w-6 h-6 text-secondary-foreground" />
              </div>
              Admin Panel
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 1. Export stats */}
            <Button variant="outline" size="sm" onClick={handleExportStats} disabled={exportingStats}>
              {exportingStats ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Export
            </Button>
            
            {/* 2. Broadcast message */}
            <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Send className="w-4 h-4 mr-1" />
                  Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Odeslat zprávu všem ({users.length} uživatelů)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Předmět</Label>
                    <Input 
                      value={broadcastSubject} 
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="Předmět zprávy..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Obsah (podporuje LvZJ)</Label>
                    <Textarea 
                      value={broadcastContent} 
                      onChange={(e) => setBroadcastContent(e.target.value)}
                      placeholder="Obsah zprávy..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleBroadcast} disabled={sendingBroadcast}>
                    {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                    Odeslat všem
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* 3. Refresh data */}
            <Button variant="outline" size="sm" onClick={handleRefreshData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Obnovit
            </Button>
            
            {/* 4. LvZJ docs */}
            <Button variant="outline" size="sm" onClick={handleOpenLvzjDocs}>
              <BookOpen className="w-4 h-4 mr-1" />
              LvZJ
            </Button>
            
            {/* 5. Site stats dialog */}
            <Dialog open={siteStatsOpen} onOpenChange={setSiteStatsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Statistiky
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Statistiky webu</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{users.length}</div>
                    <div className="text-xs text-muted-foreground">Uživatelů</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{articles.length}</div>
                    <div className="text-xs text-muted-foreground">Článků</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{games.length}</div>
                    <div className="text-xs text-muted-foreground">Tipovačky</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{purchases.length}</div>
                    <div className="text-xs text-muted-foreground">Objednávek</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{users.reduce((s, u) => s + u.points, 0)}</div>
                    <div className="text-xs text-muted-foreground">Celkem bodů</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{shopItems.filter(i => i.is_active).length}</div>
                    <div className="text-xs text-muted-foreground">Aktivní položky</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <SendMessage />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{pendingArticles.length}</p>
            <p className="text-sm text-muted-foreground">Články ke schválení</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{approvedArticles.length}</p>
            <p className="text-sm text-muted-foreground">K publikaci</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <HelpCircle className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{activeGames.length}</p>
            <p className="text-sm text-muted-foreground">Aktivní tipovačky</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6 text-center">
            <Coins className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{articles.filter(a => a.status === 'published').reduce((s, a) => s + a.points_awarded, 0) + games.filter(g => g.status === 'resolved').reduce((s, g) => s + g.points_awarded, 0)}</p>
            <p className="text-sm text-muted-foreground">Rozdáno bodů</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="articles" className="gap-2"><FileText className="w-4 h-4" />Články</TabsTrigger>
            <TabsTrigger value="tipovacky" className="gap-2"><HelpCircle className="w-4 h-4" />Tipovačky</TabsTrigger>
            <TabsTrigger value="obchudek" className="gap-2"><ShoppingBag className="w-4 h-4" />Obchůdek</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Crown className="w-4 h-4" />Uživatelé</TabsTrigger>
            <TabsTrigger value="lvzj" className="gap-2"><BookOpen className="w-4 h-4" />LvZJ</TabsTrigger>
            <TabsTrigger value="security" className="gap-2"><Shield className="w-4 h-4" />Security</TabsTrigger>
            <TabsTrigger value="gdpr" className="gap-2">
              <Trash2 className="w-4 h-4" />
              GDPR {deletionRequests.length > 0 && <Badge variant="destructive" className="ml-1">{deletionRequests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="pending">Ke schválení ({pendingArticles.length})</TabsTrigger>
                <TabsTrigger value="approved">K publikaci ({approvedArticles.length})</TabsTrigger>
                <TabsTrigger value="published">Publikováno</TabsTrigger>
                <TabsTrigger value="all">Vše ({articles.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingArticles.length === 0 ? <Card className="text-center py-12"><CardContent><CheckCircle className="w-12 h-12 text-success mx-auto mb-4" /><p className="text-muted-foreground">Žádné články ke schválení</p></CardContent></Card> : <div className="space-y-4">
                    {pendingArticles.map(article => <Card key={article.id} className="shadow-card">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div><CardTitle>{article.title}</CardTitle><CardDescription>@{article.author_username}</CardDescription></div>
                            <Badge className="bg-yellow-500">Čeká</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto"><p className="text-sm whitespace-pre-wrap">{article.content}</p></div>
                          <div className="flex gap-2">
                            <Button variant="success" className="flex-1" onClick={() => handleApprove(article.id)} disabled={processing}><CheckCircle className="w-4 h-4 mr-2" />Schválit</Button>
                            <Button variant="destructive" className="flex-1" onClick={() => handleReject(article.id)} disabled={processing}><XCircle className="w-4 h-4 mr-2" />Zamítnout</Button>
                            <Button variant="outline" size="icon" onClick={() => openEditDialog(article)} disabled={processing}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => setArticleToDelete(article)} disabled={processing}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4 mt-4">
                {approvedArticles.length === 0 ? <Card className="text-center py-12"><CardContent><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Žádné články k publikaci</p></CardContent></Card> : <div className="space-y-4">
                    {approvedArticles.map(article => {
                  const stats = calculateRatingStats(article.article_ratings || []);
                  return <Card key={article.id} className="shadow-card">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div><CardTitle>{article.title}</CardTitle><CardDescription>@{article.author_username}</CardDescription></div>
                              <Badge className="bg-blue-500">K hodnocení</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4 p-4 bg-card border rounded-lg">
                              <RatingDisplay stats={stats} showDistribution={stats.totalRatings > 0} />
                              <div className="flex flex-col justify-center">
                                <Badge variant="secondary" className="bg-success/10 text-success w-fit">Doporučeno: {stats.suggestedPoints} bodů</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="hero" className="flex-1" onClick={() => {
                          setSelectedArticleForPublish(article);
                          setPointsToAward(stats.suggestedPoints.toString());
                          setPublishMessage(generatePublishMessage(stats.suggestedPoints, stats.averageRating));
                        }}><Coins className="w-4 h-4 mr-2" />Publikovat</Button>
                              <Button variant="outline" size="icon" onClick={() => openEditDialog(article)} disabled={processing}><Edit className="w-4 h-4" /></Button>
                              <Button variant="outline" size="icon" onClick={() => setArticleToDelete(article)} disabled={processing}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </CardContent>
                        </Card>;
                })}
                  </div>}
              </TabsContent>

              <TabsContent value="published" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {articles.filter(a => a.status === 'published').map(article => <Card key={article.id} className="shadow-card">
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                        <CardDescription>@{article.author_username}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <Badge className="bg-success/10 text-success">+{article.points_awarded} bodů</Badge>
                        <Button variant="ghost" size="icon" onClick={() => setArticleToDelete(article)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </CardContent>
                    </Card>)}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-2">
                  {articles.map(article => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-500',
                    approved: 'bg-blue-500',
                    rejected: 'bg-destructive',
                    rated: 'bg-accent',
                    published: 'bg-success'
                  };
                  return <div key={article.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge className={statusColors[article.status]}>{article.status}</Badge>
                          <span className="font-medium truncate">{article.title}</span>
                          <span className="text-sm text-muted-foreground">@{article.author_username}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setArticleToDelete(article)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>;
                })}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tipovačky Tab */}
          <TabsContent value="tipovacky" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold">Správa tipovačk</h2>
              <Dialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2"><Plus className="w-4 h-4" />Nová tipovačka</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Vytvořit tipovačku</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Název</Label>
                      <Input placeholder="Např. Tipni věk" value={newGame.title} onChange={e => setNewGame({
                      ...newGame,
                      title: e.target.value
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Otázka</Label>
                      <Textarea placeholder="Kolik let je osobě na fotce?" value={newGame.question} onChange={e => setNewGame({
                      ...newGame,
                      question: e.target.value
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Obrázek (volitelné)</Label>
                      <Input type="file" accept="image/*" onChange={e => setNewGame({
                      ...newGame,
                      imageFile: e.target.files?.[0] || null
                    })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setNewGameDialogOpen(false)}>Zrušit</Button>
                    <Button variant="hero" onClick={handleCreateGame} disabled={processing}>{processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}<span className="ml-2">Vytvořit</span></Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {games.map(game => <Card key={game.id} className={`shadow-card ${game.status === 'resolved' ? 'opacity-70' : ''}`}>
                  {game.image_url && <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" />
                    </div>}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <Badge className={game.status === 'active' ? 'bg-accent' : 'bg-success'}>{game.status === 'active' ? 'Aktivní' : 'Ukončeno'}</Badge>
                    </div>
                    <CardDescription>{game.question}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {game.tips?.length || 0} tipů
                    </div>

                    {game.status === 'active' && <Button variant="outline" className="w-full" onClick={() => {
                  setSelectedGameForResolve(game);
                  setGamePoints('10');
                }}>
                        <Trophy className="w-4 h-4 mr-2" />Ukončit a vybrat vítěze
                      </Button>}

                    {game.status === 'resolved' && game.correct_answer && <div className="p-2 bg-success/10 rounded text-sm">
                        <span className="text-muted-foreground">Odpověď:</span> <strong>{game.correct_answer}</strong>
                      </div>}
                  </CardContent>
                </Card>)}
            </div>
          </TabsContent>

          {/* Obchůdek Tab */}
          <TabsContent value="obchudek" className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-display font-bold">Správa obchůdku</h2>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setGiftItemOpen(true)}>
                  <Award className="w-4 h-4" />
                  Darovat předmět
                </Button>
                <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" className="gap-2"><Plus className="w-4 h-4" />Nová položka</Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Vytvořit položku</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Název</Label>
                      <Input placeholder="Např. Záhadný balíček" value={newItem.name} onChange={e => setNewItem({
                      ...newItem,
                      name: e.target.value
                    })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Popis (volitelné)</Label>
                      <Textarea placeholder="Popis položky..." value={newItem.description} onChange={e => setNewItem({
                      ...newItem,
                      description: e.target.value
                    })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cena (body)</Label>
                        <Input type="number" min="0" placeholder="100" value={newItem.price} onChange={e => setNewItem({
                        ...newItem,
                        price: e.target.value
                      })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Skladem (prázdné = neomezeně)</Label>
                        <Input type="number" min="0" placeholder="Neomezeně" value={newItem.stock} onChange={e => setNewItem({
                        ...newItem,
                        stock: e.target.value
                      })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setNewItemDialogOpen(false)}>Zrušit</Button>
                    <Button variant="hero" onClick={handleCreateShopItem} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="ml-2">Vytvořit</span>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Položky ({shopItems.length})</TabsTrigger>
                <TabsTrigger value="orders">Objednávky ({purchases.filter(p => p.status === 'pending').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-4">
                {shopItems.length === 0 ? <Card className="text-center py-12">
                    <CardContent>
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Žádné položky v obchůdku</p>
                    </CardContent>
                  </Card> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {shopItems.map(item => <Card key={item.id} className={`shadow-card ${!item.is_active ? 'opacity-60' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <Badge className={item.is_active ? 'bg-success' : 'bg-muted'}>{item.is_active ? 'Aktivní' : 'Skryto'}</Badge>
                          </div>
                          {item.description && <CardDescription>{item.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-success/10 text-success gap-1"><Coins className="w-3 h-3" />{item.price} bodů</Badge>
                            <span className="text-sm text-muted-foreground">{item.stock !== null ? `Skladem: ${item.stock}` : 'Neomezeně'}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleToggleItemActive(item)}>
                              {item.is_active ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
                              {item.is_active ? 'Skrýt' : 'Aktivovat'}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => {
                        setItemToEdit(item);
                        setEditedItem({
                          name: item.name,
                          description: item.description || '',
                          price: item.price.toString(),
                          stock: item.stock?.toString() || ''
                        });
                      }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteShopItem(item.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>}
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                {purchases.length === 0 ? <Card className="text-center py-12">
                    <CardContent>
                      <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Žádné objednávky</p>
                    </CardContent>
                  </Card> : <div className="space-y-3">
                    {purchases.map(purchase => <Card key={purchase.id} className="shadow-card">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-medium">{purchase.item_name}</p>
                              <p className="text-sm text-muted-foreground">
                                <UserBadge username={purchase.username || ''} /> • {new Date(purchase.created_at).toLocaleDateString('cs-CZ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-success/10 text-success">{purchase.total_price} bodů</Badge>
                              <Select value={purchase.status} onValueChange={value => handleUpdatePurchaseStatus(purchase.id, value)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Čeká</SelectItem>
                                  <SelectItem value="completed">Vyřízeno</SelectItem>
                                  <SelectItem value="cancelled">Zrušeno</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-display font-bold">Správa uživatelů a rolí</h2>
              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Přidat uživatele
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vytvořit nového uživatele</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Alíkovská přezdívka</Label>
                      <Input 
                        placeholder="Např. Ferda_Mravenec" 
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Email pro přihlášení bude: {newUsername.toLowerCase().replace(/[^a-z0-9]/g, '') || 'prezdivka'}@ls.ls
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Heslo</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="text"
                          placeholder="Heslo pro první přihlášení" 
                          value={newUserPassword}
                          onChange={e => setNewUserPassword(e.target.value)}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={generateRandomPassword}
                        >
                          Generovat
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uživatel bude při prvním přihlášení vyzván ke změně hesla.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>Zrušit</Button>
                    <Button variant="hero" onClick={handleCreateUser} disabled={creatingUser}>
                      {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      <span className="ml-2">Vytvořit</span>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map(u => <Card key={u.id} className={`shadow-card ${u.for_fun ? 'border-accent/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg"><UserBadge username={u.username} roles={u.roles} /></CardTitle>
                        {u.for_fun && <Badge variant="outline" className="text-xs border-accent text-accent">🎉 Pro zábavu</Badge>}
                      </div>
                      <Badge variant="secondary">{u.points} bodů</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(role => <Badge key={role} className={getRoleBadgeColor(role)}>
                          {getRoleDisplayName(role)}
                          {role !== 'user' && <button onClick={() => handleRemoveRole(u.id, role)} className="ml-1 hover:text-destructive" disabled={processing}>
                              ×
                            </button>}
                        </Badge>)}
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{u.for_fun ? '🎉' : '🏆'}</span>
                        <span className="text-muted-foreground">
                          {u.for_fun ? 'Hraje pro zábavu' : 'Soutěží o výhru'}
                        </span>
                      </div>
                      <Switch
                        checked={u.for_fun}
                        onCheckedChange={() => handleToggleForFun(u.id, u.for_fun)}
                        disabled={processing}
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setSelectedUserForRole(u)}>
                      <UserPlus className="w-4 h-4" />
                      Přidat roli
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 text-destructive" 
                      onClick={() => { setUserToBlock(u); setBlockUserOpen(true); }}
                    >
                      <Ban className="w-4 h-4" />
                      Zablokovat
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
            
            {/* Blocked Users */}
            {blockedUsers.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-destructive" />
                  Zablokovaní uživatelé ({blockedUsers.length})
                </h3>
                <div className="space-y-2">
                  {blockedUsers.map(b => (
                    <Card key={b.id} className="shadow-card border-destructive/30">
                      <CardContent className="pt-4 flex items-center justify-between">
                        <div>
                          <span className="font-medium">@{b.username}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {new Date(b.blocked_at).toLocaleDateString('cs-CZ')}
                          </span>
                          {b.reason && <p className="text-sm text-muted-foreground">{b.reason}</p>}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnblockUser(b.id, b.user_id)}
                          disabled={processing}
                        >
                          Odblokovat
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* LvZJ Tab */}
          <TabsContent value="lvzj" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Správa omezení LvZJ příkazů
              </h2>
              <Dialog open={newRestrictionOpen} onOpenChange={setNewRestrictionOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nové omezení
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Přidat omezení příkazu</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Název příkazu (bez závorek)</Label>
                      <Input 
                        placeholder="např. melodie" 
                        value={newRestriction.command_name}
                        onChange={e => setNewRestriction({...newRestriction, command_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Popis (volitelné)</Label>
                      <Input 
                        placeholder="Co příkaz dělá..." 
                        value={newRestriction.description}
                        onChange={e => setNewRestriction({...newRestriction, description: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Povolené role (prázdné = všichni)</Label>
                      <div className="flex flex-wrap gap-2">
                        {['hudebnik', 'veverka', 'vedouci_prodejny', 'helper'].map(role => (
                          <Badge 
                            key={role}
                            variant={newRestriction.allowed_roles.includes(role) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const roles = newRestriction.allowed_roles.includes(role)
                                ? newRestriction.allowed_roles.filter(r => r !== role)
                                : [...newRestriction.allowed_roles, role];
                              setNewRestriction({...newRestriction, allowed_roles: roles});
                            }}
                          >
                            {role === 'hudebnik' ? '🎵 Hudebník' : 
                             role === 'veverka' ? '🐿️ Veverka' :
                             role === 'vedouci_prodejny' ? '🛒 Vedoucí' : 
                             'Pomocníček'}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Organizátor má vždy přístup ke všem příkazům.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setNewRestrictionOpen(false)}>Zrušit</Button>
                    <Button variant="hero" onClick={handleAddRestriction}>
                      <Plus className="w-4 h-4 mr-1" />
                      Přidat
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Aktivní omezení
                </CardTitle>
                <CardDescription>
                  Příkazy, které jsou omezeny na určité role. Organizátor má vždy přístup ke všem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lvzjRestrictions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žádná omezení nejsou nastavena</p>
                ) : (
                  <div className="space-y-4">
                    {lvzjRestrictions.map(restriction => (
                      <div key={restriction.id} className="p-4 bg-muted/50 rounded-lg flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                              ({restriction.command_name})
                            </code>
                            {restriction.command_name === 'melodie' && <Music className="w-4 h-4 text-purple-500" />}
                          </div>
                          {restriction.description && (
                            <p className="text-sm text-muted-foreground mb-2">{restriction.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {['hudebnik', 'veverka', 'vedouci_prodejny', 'helper'].map(role => (
                              <Badge 
                                key={role}
                                variant={restriction.allowed_roles.includes(role) ? "default" : "outline"}
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                  const roles = restriction.allowed_roles.includes(role)
                                    ? restriction.allowed_roles.filter(r => r !== role)
                                    : [...restriction.allowed_roles, role];
                                  handleUpdateRestriction(restriction.id, roles);
                                }}
                              >
                                {role === 'hudebnik' ? '🎵' : 
                                 role === 'veverka' ? '🐿️' :
                                 role === 'vedouci_prodejny' ? '🛒' : 
                                 '👑'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveRestriction(restriction.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dostupné role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <span className="text-2xl">👑</span>
                    <p className="font-medium text-sm">Organizátor</p>
                    <p className="text-xs text-muted-foreground">Všechny příkazy</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <span className="text-2xl">🎵</span>
                    <p className="font-medium text-sm">Hudebník</p>
                    <p className="text-xs text-muted-foreground">Hudební příkazy</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <span className="text-2xl">🐿️</span>
                    <p className="font-medium text-sm">Veverka</p>
                    <p className="text-xs text-muted-foreground">Redakční příkazy</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <span className="text-2xl">🛒</span>
                    <p className="font-medium text-sm">Vedoucí prodejny</p>
                    <p className="text-xs text-muted-foreground">Obchodní příkazy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GDPR Tab */}
          <TabsContent value="gdpr" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold">Žádosti o smazání údajů</h2>
            </div>

            {deletionRequests.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné čekající žádosti</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deletionRequests.map(req => (
                  <Card key={req.id} className="shadow-card border-destructive/30">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            @{req.username}
                          </CardTitle>
                          <CardDescription>
                            Žádost z {new Date(req.created_at).toLocaleDateString('cs-CZ')}
                          </CardDescription>
                        </div>
                        <Badge variant="destructive">Čeká na vyřízení</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm font-medium mb-1">Důvod:</p>
                        <p className="text-sm text-muted-foreground">{req.reason || 'Bez udání důvodu'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          className="flex-1" 
                          onClick={() => setRequestToProcess(req)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Smazat údaje
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setRequestToProcess(req);
                            handleRejectDeletion();
                          }}
                          disabled={processing}
                        >
                          Zamítnout
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityLogs />
          </TabsContent>
        </Tabs>

        {/* Publish Article Dialog */}
        <Dialog open={!!selectedArticleForPublish} onOpenChange={open => {
        if (!open) {
          setSelectedArticleForPublish(null);
          setPublishMessage('');
        }
      }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Coins className="w-5 h-5 text-primary" />Publikovat článek</DialogTitle></DialogHeader>
            {selectedArticleForPublish && <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedArticleForPublish.title}</p>
                  <p className="text-sm text-muted-foreground">@{selectedArticleForPublish.author_username}</p>
                </div>
                <div className="space-y-2">
                  <Label>Bodová odměna</Label>
                  <Input type="number" min="0" value={pointsToAward} onChange={e => {
                setPointsToAward(e.target.value);
                const stats = calculateRatingStats(selectedArticleForPublish.article_ratings || []);
                setPublishMessage(generatePublishMessage(parseInt(e.target.value) || 0, stats.averageRating));
              }} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Zpráva pro autora (volitelné)</Label>
                  <Textarea value={publishMessage} onChange={e => setPublishMessage(e.target.value)} rows={6} placeholder="Zpráva bude odeslána autorovi článku..." />
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => {
              setSelectedArticleForPublish(null);
              setPublishMessage('');
            }}>Zrušit</Button>
              <Button variant="hero" onClick={handlePublishWithPoints} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">Publikovat a odeslat</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Game Dialog */}
        <Dialog open={!!selectedGameForResolve} onOpenChange={open => !open && setSelectedGameForResolve(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Ukončit tipovačku</DialogTitle></DialogHeader>
            {selectedGameForResolve && <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedGameForResolve.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedGameForResolve.question}</p>
                </div>

                <div className="space-y-2">
                  <Label>Správná odpověď (volitelné)</Label>
                  <Input placeholder="Např. 42" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Vyber vítěze</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedGameForResolve.tips?.map(tip => <div key={tip.id} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedWinnerId === tip.user_id ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`} onClick={() => setSelectedWinnerId(tip.user_id)}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">@{tip.username}</span>
                          <Badge variant="secondary">{tip.tip}</Badge>
                        </div>
                      </div>)}
                    {(!selectedGameForResolve.tips || selectedGameForResolve.tips.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Žádné tipy</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Body pro vítěze</Label>
                  <Input type="number" min="0" value={gamePoints} onChange={e => setGamePoints(e.target.value)} />
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedGameForResolve(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handleResolveGame} disabled={processing || !selectedWinnerId}>{processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}<span className="ml-2">Ukončit a odměnit</span></Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Article Dialog */}
        <Dialog open={!!articleToDelete} onOpenChange={open => !open && setArticleToDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" />Smazat článek</DialogTitle></DialogHeader>
            {articleToDelete && <div className="space-y-4 py-4">
                <p className="text-muted-foreground">Opravdu chceš smazat tento článek? Tato akce je nevratná.</p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{articleToDelete.title}</p>
                  <p className="text-sm text-muted-foreground">@{articleToDelete.author_username}</p>
                  <Badge className="mt-2">{articleToDelete.status}</Badge>
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setArticleToDelete(null)}>Zrušit</Button>
              <Button variant="destructive" onClick={handleDeleteArticle} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="ml-2">Smazat</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Role Dialog */}
        <Dialog open={!!selectedUserForRole} onOpenChange={open => !open && setSelectedUserForRole(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-primary" />Přidat roli</DialogTitle></DialogHeader>
            {selectedUserForRole && <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">@{selectedUserForRole.username}</p>
                  <div className="flex gap-1 mt-2">
                    {selectedUserForRole.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vybrat roli</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyber roli..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helper">Pomocníček</SelectItem>
                      <SelectItem value="organizer">Organizátor</SelectItem>
                      <SelectItem value="veverka">🐿️ Veverka (redakce)</SelectItem>
                      <SelectItem value="hudebnik">🎵 Hudebník (zábava)</SelectItem>
                      <SelectItem value="vedouci_prodejny">🛒 Vedoucí prodejny</SelectItem>
                      <SelectItem value="alik_admin">🔵 Zvěrolékař Alíka</SelectItem>
                      <SelectItem value="alik_helper">🟢 Správce Alíka</SelectItem>
                      <SelectItem value="alik_editor">🔴 Redaktor Alíka</SelectItem>
                      <SelectItem value="alik_club_manager">🔴 Správce klubovny</SelectItem>
                      <SelectItem value="alik_board_manager">🔴 Správce nástěnek</SelectItem>
                      <SelectItem value="alik_jester">🃏 Alíkův šašek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedUserForRole(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handleAssignRole} disabled={processing || !newRole}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span className="ml-2">Přidat roli</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Article Dialog */}
        <Dialog open={!!articleToEdit} onOpenChange={open => {
        if (!open) {
          setArticleToEdit(null);
          setEditedTitle('');
          setEditedContent('');
        }
      }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-primary" />Upravit článek</DialogTitle></DialogHeader>
            {articleToEdit && <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Název článku</Label>
                  <Input value={editedTitle} onChange={e => setEditedTitle(e.target.value)} placeholder="Název článku" />
                </div>
                <div className="space-y-2">
                  <Label>Obsah článku</Label>
                  <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={12} placeholder="Obsah článku..." />
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => {
              setArticleToEdit(null);
              setEditedTitle('');
              setEditedContent('');
            }}>Zrušit</Button>
              <Button variant="hero" onClick={handleEditArticle} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span className="ml-2">Uložit změny</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Shop Item Dialog */}
        <Dialog open={!!itemToEdit} onOpenChange={open => !open && setItemToEdit(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-primary" />Upravit položku</DialogTitle></DialogHeader>
            {itemToEdit && <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Název</Label>
                  <Input value={editedItem.name} onChange={e => setEditedItem({
                ...editedItem,
                name: e.target.value
              })} />
                </div>
                <div className="space-y-2">
                  <Label>Popis</Label>
                  <Textarea value={editedItem.description} onChange={e => setEditedItem({
                ...editedItem,
                description: e.target.value
              })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cena (body)</Label>
                    <Input type="number" min="0" value={editedItem.price} onChange={e => setEditedItem({
                  ...editedItem,
                  price: e.target.value
                })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Skladem</Label>
                    <Input type="number" min="0" placeholder="Neomezeně" value={editedItem.stock} onChange={e => setEditedItem({
                  ...editedItem,
                  stock: e.target.value
                })} />
                  </div>
                </div>
              </div>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setItemToEdit(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handleUpdateShopItem} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span className="ml-2">Uložit</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Data Dialog */}
        <Dialog open={!!requestToProcess} onOpenChange={open => !open && setRequestToProcess(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Potvrdit smazání údajů
              </DialogTitle>
            </DialogHeader>
            {requestToProcess && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="font-medium text-destructive">Tato akce je nevratná!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budou smazány všechny údaje uživatele @{requestToProcess.username}:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                    <li>Články</li>
                    <li>Tipy v tipovačkách</li>
                    <li>Hodnocení</li>
                    <li>Zprávy</li>
                    <li>Objednávky</li>
                    <li>Body a profil</li>
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRequestToProcess(null)}>Zrušit</Button>
              <Button variant="destructive" onClick={handleApproveDeletion} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="ml-2">Smazat vše</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block User Dialog */}
        <Dialog open={blockUserOpen} onOpenChange={setBlockUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                Zablokovat uživatele
              </DialogTitle>
            </DialogHeader>
            {userToBlock && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">@{userToBlock.username}</p>
                  <p className="text-sm text-muted-foreground">{userToBlock.points} bodů</p>
                </div>
                <div className="space-y-2">
                  <Label>Důvod blokace (volitelné)</Label>
                  <Textarea 
                    value={blockReason} 
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Důvod pro zablokování..."
                    rows={3}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Uživateli bude odeslána zpráva o zablokování.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setBlockUserOpen(false); setUserToBlock(null); }}>Zrušit</Button>
              <Button variant="destructive" onClick={handleBlockUser} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                <span className="ml-2">Zablokovat</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gift Item Dialog */}
        <Dialog open={giftItemOpen} onOpenChange={(open) => {
          setGiftItemOpen(open);
          if (!open) {
            setGiftTargetUser(null);
            setGiftItem(null);
            setGiftQuantity('1');
            setGiftReason('');
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Darovat předmět
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Vybrat uživatele</Label>
                <Select 
                  value={giftTargetUser?.id || ''} 
                  onValueChange={(id) => setGiftTargetUser(users.find(u => u.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber příjemce..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>@{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Vybrat předmět</Label>
                <Select 
                  value={giftItem?.id || ''} 
                  onValueChange={(id) => setGiftItem(shopItems.find(i => i.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber předmět..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shopItems.filter(i => i.is_active).map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Množství</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={giftQuantity}
                  onChange={(e) => setGiftQuantity(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Zpráva pro příjemce (volitelné)</Label>
                <Textarea 
                  value={giftReason}
                  onChange={(e) => setGiftReason(e.target.value)}
                  placeholder="Např. Dar za aktivitu v soutěži..."
                  rows={3}
                />
              </div>
              
              {giftTargetUser && giftItem && (
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm">
                    <strong>@{giftTargetUser.username}</strong> obdrží{' '}
                    <strong>{giftQuantity}× {giftItem.name}</strong>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setGiftItemOpen(false)}>Zrušit</Button>
              <Button 
                variant="hero" 
                onClick={handleGiftItem} 
                disabled={giftingItem || !giftTargetUser || !giftItem}
              >
                {giftingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span className="ml-2">Darovat</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
}