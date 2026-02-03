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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star,
  Send,
  Eye,
  Loader2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import PublishedArticlesList from '@/components/PublishedArticlesList';
import { LvZJContent } from '@/lib/lvzj-parser';

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

const statusConfig = {
  pending: { label: 'Čeká na schválení', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Schváleno k hodnocení', color: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Zamítnuto', color: 'bg-destructive', icon: XCircle },
  rated: { label: 'Ohodnoceno', color: 'bg-accent', icon: Star },
  published: { label: 'Publikováno', color: 'bg-success', icon: CheckCircle },
};

export default function Clankovnice() {
  const { user, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: '', content: '' });

  useEffect(() => {
    if (user) {
      fetchArticles();
    }
  }, [user]);

  const fetchArticles = async () => {
    setLoading(true);
    
    // Fetch articles available for rating (approved status)
    const { data: publicArticles } = await supabase
      .from('articles')
      .select(`
        *,
        article_ratings(rating, user_id)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    // Fetch user's own articles
    const { data: userArticles } = await supabase
      .from('articles')
      .select(`
        *,
        article_ratings(rating, user_id)
      `)
      .eq('author_id', user?.id)
      .order('created_at', { ascending: false });

    // Fetch profiles separately to get usernames
    const authorIds = [...new Set([
      ...(publicArticles || []).map(a => a.author_id),
      ...(userArticles || []).map(a => a.author_id)
    ])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const mapArticles = (articles: typeof publicArticles) => 
      (articles || []).map(a => ({
        ...a,
        author_username: profileMap.get(a.author_id) || 'Neznámý'
      })) as Article[];

    setArticles(mapArticles(publicArticles));
    setMyArticles(mapArticles(userArticles));
    setLoading(false);
  };

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      toast.error('Vyplň název i obsah článku');
      return;
    }

    if (newArticle.content.length < 100) {
      toast.error('Článek musí mít alespoň 100 znaků');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase.from('articles').insert({
      author_id: user?.id,
      title: newArticle.title.trim(),
      content: newArticle.content.trim(),
    });

    setSubmitting(false);

    if (error) {
      toast.error('Chyba při odesílání článku');
    } else {
      toast.success('Článek odeslán ke schválení!');
      setNewArticle({ title: '', content: '' });
      setDialogOpen(false);
      fetchArticles();
    }
  };

  const handleRate = async (articleId: string, rating: number) => {
    const { error } = await supabase.from('article_ratings').upsert({
      article_id: articleId,
      user_id: user?.id,
      rating,
    });

    if (error) {
      toast.error('Chyba při hodnocení');
    } else {
      toast.success(`Ohodnoceno ${rating}/10!`);
      fetchArticles();
    }
  };

  const getAverageRating = (ratings: { rating: number }[]) => {
    if (!ratings || ratings.length === 0) return null;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const getUserRating = (ratings: { rating: number; user_id: string }[]) => {
    if (!ratings || !user) return null;
    const myRating = ratings.find(r => r.user_id === user.id);
    return myRating?.rating || null;
  };

  if (authLoading) {
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-card">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              Článkovnice
            </h1>
            <p className="text-muted-foreground mt-2">
              Napiš článek, nech ho ohodnotit a získej body!
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="w-5 h-5" />
                Napsat článek
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Nový článek</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitArticle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Název článku</Label>
                  <Input
                    id="title"
                    placeholder="Zadej název..."
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Obsah článku</Label>
                  <Textarea
                    id="content"
                    placeholder="Napiš svůj článek... (min. 100 znaků)"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    rows={10}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {newArticle.content.length} znaků
                  </p>
                </div>
                <Button type="submit" variant="hero" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Odeslat ke schválení
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="rate" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="rate">K hodnocení</TabsTrigger>
            <TabsTrigger value="my">Moje články</TabsTrigger>
            <TabsTrigger value="published">Publikované</TabsTrigger>
          </TabsList>

          {/* Articles to rate */}
          <TabsContent value="rate" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : articles.filter(a => a.author_id !== user?.id).length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné články k hodnocení</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles
                  .filter(a => a.author_id !== user?.id)
                  .map((article) => {
                    const avgRating = getAverageRating(article.article_ratings || []);
                    const myRating = getUserRating(article.article_ratings || []);

                    return (
                      <Card key={article.id} className="card-hover">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                            {avgRating && (
                              <Badge variant="secondary" className="shrink-0">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {avgRating}
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            od @{article.author_username}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {article.content}
                          </p>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full gap-2">
                                <Eye className="w-4 h-4" />
                                {myRating ? 'Změnit hodnocení' : 'Přečíst a ohodnotit'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="font-display text-xl">{article.title}</DialogTitle>
                                <p className="text-sm text-muted-foreground">od @{article.author_username}</p>
                              </DialogHeader>
                              <div className="prose prose-sm max-w-none py-4">
                                <LvZJContent content={article.content} />
                              </div>
                              <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-3">Tvé hodnocení (1-10):</p>
                                <div className="flex flex-wrap gap-2">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                                    <Button
                                      key={rating}
                                      variant={myRating === rating ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleRate(article.id, rating)}
                                      className="w-10 h-10"
                                    >
                                      {rating}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* My articles */}
          <TabsContent value="my" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : myArticles.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Zatím jsi nenapsal žádný článek</p>
                  <Button variant="hero" onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Napsat první článek
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myArticles.map((article) => {
                  const status = statusConfig[article.status];
                  const StatusIcon = status.icon;
                  const avgRating = getAverageRating(article.article_ratings || []);

                  return (
                    <Card key={article.id} className="card-hover">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                          <Badge className={`${status.color} text-primary-foreground shrink-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription>
                          {new Date(article.created_at).toLocaleDateString('cs-CZ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {article.content}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm">
                          {avgRating && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              Průměr: {avgRating}/10
                            </span>
                          )}
                          {article.points_awarded > 0 && (
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              +{article.points_awarded} bodů
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Published articles */}
          <TabsContent value="published" className="space-y-4">
            <PublishedArticlesList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
