import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LvZJContent } from '@/lib/lvzj-parser';
import UserBadge from '@/components/UserBadge';
import { FileText, Edit, Eye, Clock, CheckCircle, AlertTriangle, Loader2, Search, Squirrel } from 'lucide-react';
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
  author_roles?: string[];
}

const statusConfig = {
  pending: { label: 'Čeká na schválení', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Schváleno k hodnocení', color: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Zamítnuto', color: 'bg-red-500', icon: AlertTriangle },
  rated: { label: 'Ohodnoceno', color: 'bg-purple-500', icon: CheckCircle },
  published: { label: 'Publikováno', color: 'bg-green-500', icon: CheckCircle },
};

export default function Redakce() {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit dialog
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (user) {
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    setCheckingRole(true);
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    const roles = data?.map(r => r.role as string) || [];
    setUserRoles(roles);
    
    // Veverka, organizer, or helper can access
    const canAccess = roles.some(r => r === 'veverka' || r === 'organizer' || r === 'helper');
    setHasAccess(canAccess);
    
    if (canAccess) {
      fetchArticles();
    }
    setCheckingRole(false);
  };

  const fetchArticles = async () => {
    setLoading(true);
    
    const { data: allArticles } = await supabase
      .from('articles')
      .select('*')
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });
    
    if (!allArticles) {
      setArticles([]);
      setLoading(false);
      return;
    }
    
    // Get author info
    const authorIds = [...new Set(allArticles.map(a => a.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);
    
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', authorIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    const rolesMap = new Map<string, string[]>();
    rolesData?.forEach(r => {
      const existing = rolesMap.get(r.user_id) || [];
      rolesMap.set(r.user_id, [...existing, r.role]);
    });
    
    const mappedArticles = allArticles.map(a => ({
      ...a,
      author_username: profileMap.get(a.author_id) || 'Neznámý',
      author_roles: rolesMap.get(a.author_id) || []
    })) as Article[];
    
    setArticles(mappedArticles);
    setLoading(false);
  };

  const openEditDialog = (article: Article) => {
    setArticleToEdit(article);
    setEditedTitle(article.title);
    setEditedContent(article.content);
    setShowPreview(false);
  };

  const handleSaveEdit = async () => {
    if (!articleToEdit) return;
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast.error('Vyplň název i obsah');
      return;
    }
    
    setProcessing(true);
    const { error } = await supabase
      .from('articles')
      .update({
        title: editedTitle.trim(),
        content: editedContent.trim()
      })
      .eq('id', articleToEdit.id);
    
    if (error) {
      toast.error('Chyba při ukládání');
    } else {
      toast.success('Článek upraven');
      fetchArticles();
    }
    
    setArticleToEdit(null);
    setEditedTitle('');
    setEditedContent('');
    setProcessing(false);
  };

  const filteredArticles = articles.filter(article => {
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.author_username?.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query)
    );
  });

  const pendingArticles = filteredArticles.filter(a => a.status === 'pending');
  const approvedArticles = filteredArticles.filter(a => a.status === 'approved');

  if (authLoading || checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Squirrel className="w-16 h-16 mx-auto mb-4 text-amber-600" />
            <h2 className="text-xl font-bold mb-2">Přístup odepřen</h2>
            <p className="text-muted-foreground">
              Tato sekce je dostupná pouze pro Veverky (redaktory) a organizátory.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Squirrel className="w-6 h-6 text-white" />
            </div>
            Redakce
          </h1>
          <p className="text-muted-foreground mt-2">
            Upravuj a spravuj články ostatních uživatelů
          </p>
        </div>
        
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat články..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Čekající ({pendingArticles.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Schválené ({approvedArticles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Žádné články nečekají na schválení</p>
                </CardContent>
              </Card>
            ) : (
              pendingArticles.map(article => (
                <ArticleCard 
                  key={article.id} 
                  article={article} 
                  onEdit={() => openEditDialog(article)}
                  userRoles={userRoles}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Žádné schválené články</p>
                </CardContent>
              </Card>
            ) : (
              approvedArticles.map(article => (
                <ArticleCard 
                  key={article.id} 
                  article={article} 
                  onEdit={() => openEditDialog(article)}
                  userRoles={userRoles}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!articleToEdit} onOpenChange={(open) => !open && setArticleToEdit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Upravit článek
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Název článku</label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Název článku"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={!showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editor
              </Button>
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Náhled
              </Button>
            </div>
            
            {showPreview ? (
              <Card className="min-h-[300px]">
                <CardHeader>
                  <CardTitle>{editedTitle || 'Bez názvu'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <LvZJContent content={editedContent} userRoles={userRoles} />
                </CardContent>
              </Card>
            ) : (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Obsah článku (LvZJ formátování)"
                className="min-h-[300px] font-mono text-sm"
              />
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleToEdit(null)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveEdit} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Uložit změny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Article card component
function ArticleCard({ article, onEdit, userRoles }: { 
  article: Article; 
  onEdit: () => void;
  userRoles: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[article.status];
  const StatusIcon = config.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{article.title}</CardTitle>
              <Badge className={`${config.color} text-white gap-1`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <span>Autor:</span>
              <UserBadge 
                username={article.author_username || 'Neznámý'} 
                roles={article.author_roles}
              />
              <span className="text-xs">
                • {new Date(article.created_at).toLocaleDateString('cs-CZ')}
              </span>
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
              <Eye className="w-4 h-4 mr-1" />
              {expanded ? 'Skrýt' : 'Zobrazit'}
            </Button>
            <Button size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-1" />
              Upravit
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 border-t">
          <div className="pt-4">
            <LvZJContent content={article.content} userRoles={userRoles} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
