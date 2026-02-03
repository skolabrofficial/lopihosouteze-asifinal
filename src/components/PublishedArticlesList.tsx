import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, FileText, Coins, Eye, Loader2 } from 'lucide-react';
import { calculateRatingStats } from '@/lib/points';
import RatingDisplay from './RatingDisplay';
import UserBadge from './UserBadge';
interface PublishedArticle {
  id: string;
  title: string;
  content: string;
  points_awarded: number;
  created_at: string;
  author_id: string;
  author_username: string;
  author_gender: string | null;
  author_roles: string[];
  ratings: number[];
}

const getPublishedByText = (username: string, gender: string | null) => {
  if (gender === 'male') {
    return `Tento příspěvek zveřejnil ${username}`;
  } else if (gender === 'female') {
    return `Tento příspěvek zveřejnila ${username}`;
  }
  return `Autor: ${username}`;
};

export default function PublishedArticlesList() {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishedArticles();
  }, []);

  const fetchPublishedArticles = async () => {
    const { data: articlesData } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        content,
        points_awarded,
        created_at,
        author_id,
        article_ratings(rating)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (articlesData && articlesData.length > 0) {
      const authorIds = [...new Set(articlesData.map(a => a.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', authorIds);

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      // Type assertion to handle potential gender column (will be added via migration)
      const profileMap = new Map(profiles?.map(p => [p.id, { username: p.username, gender: (p as any).gender || null }]) || []);
      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach(r => {
        if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
        rolesMap.get(r.user_id)!.push(r.role);
      });

      const mapped = articlesData.map(a => {
        const profile = profileMap.get(a.author_id);
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          points_awarded: a.points_awarded || 0,
          created_at: a.created_at,
          author_id: a.author_id,
          author_username: profile?.username || 'Neznámý',
          author_gender: profile?.gender || null,
          author_roles: rolesMap.get(a.author_id) || [],
          ratings: (a.article_ratings || []).map((r: { rating: number }) => r.rating),
        };
      });

      setArticles(mapped);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Zatím žádné publikované články</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => {
        const stats = calculateRatingStats(article.ratings.map(r => ({ rating: r })));
        
        return (
          <Card key={article.id} className="card-hover flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                <Badge className="bg-success text-success-foreground shrink-0">
                  <Coins className="w-3 h-3 mr-1" />
                  +{article.points_awarded}
                </Badge>
              </div>
              <CardDescription className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  od <UserBadge username={article.author_username} roles={article.author_roles} showAt={false} />
                </span>
                <span className="text-xs">
                  {new Date(article.created_at).toLocaleDateString('cs-CZ')}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                {article.content}
              </p>
              
              <div className="flex items-center justify-between mt-3 text-sm">
                {stats.averageRating !== null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {stats.averageRating.toFixed(1)}/10
                    <span className="text-xs">({stats.totalRatings}×)</span>
                  </span>
                )}
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    <Eye className="w-4 h-4" />
                    Přečíst článek
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">{article.title}</DialogTitle>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        od <UserBadge username={article.author_username} roles={article.author_roles} showAt={false} />
                      </span>
                      <span>{new Date(article.created_at).toLocaleDateString('cs-CZ')}</span>
                    </div>
                  </DialogHeader>
                  
                  <div className="py-4 border-y">
                    <RatingDisplay stats={stats} showDistribution />
                  </div>
                  
                  <div className="prose prose-sm max-w-none py-4 whitespace-pre-wrap">
                    {article.content}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-muted-foreground italic">
                      {getPublishedByText(article.author_username, article.author_gender)}
                    </span>
                    <Badge className="bg-success/10 text-success">
                      <Coins className="w-3 h-3 mr-1" />
                      +{article.points_awarded} bodů
                    </Badge>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
