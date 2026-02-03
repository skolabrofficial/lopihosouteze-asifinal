import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, FileText, ChevronLeft, ChevronRight, Coins, Eye } from 'lucide-react';
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
  author_roles: string[];
  ratings: number[];
}

export default function PublishedArticlesCarousel() {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      .order('created_at', { ascending: false })
      .limit(10);

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

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach(r => {
        if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
        rolesMap.get(r.user_id)!.push(r.role);
      });

      const mapped = articlesData.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        points_awarded: a.points_awarded || 0,
        created_at: a.created_at,
        author_id: a.author_id,
        author_username: profileMap.get(a.author_id) || 'Neznámý',
        author_roles: rolesMap.get(a.author_id) || [],
        ratings: (a.article_ratings || []).map((r: { rating: number }) => r.rating),
      }));

      setArticles(mapped);
    }
    setLoading(false);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, articles.length - 2));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, articles.length - 2)) % Math.max(1, articles.length - 2));
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="flex-shrink-0 w-[320px] animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  const visibleArticles = articles.slice(currentIndex, currentIndex + 3);

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Publikované články
            </h2>
            <p className="text-muted-foreground mt-1">
              Nejnovější odměněné články od soutěžících
            </p>
          </div>
          
          {articles.length > 3 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                className="rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                className="rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleArticles.map((article) => {
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
                      od <UserBadge username={article.author_username} roles={article.author_roles} showAt={false} className="text-muted-foreground" />
                    </span>
                    {stats.averageRating !== null && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        {stats.averageRating.toFixed(1)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                    {article.content}
                  </p>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-4 gap-2">
                        <Eye className="w-4 h-4" />
                        Přečíst celý článek
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
                        <RatingDisplay stats={stats} compact />
                      </div>
                      
                      <div className="prose prose-sm max-w-none py-4 whitespace-pre-wrap">
                        {article.content}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Badge className="bg-success/10 text-success">
                          <Coins className="w-3 h-3 mr-1" />
                          Autor získal +{article.points_awarded} bodů
                        </Badge>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
