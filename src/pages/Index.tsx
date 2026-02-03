import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Leaderboard from '@/components/Leaderboard';
import PublishedArticlesCarousel from '@/components/PublishedArticlesCarousel';
import { 
  Trophy, 
  FileText, 
  Camera, 
  HelpCircle, 
  ShoppingBag, 
  Sparkles,
  ArrowRight,
  Star,
  Coins,
  Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const categories = [
  {
    href: '/clankovnice',
    title: 'Článkovnice',
    description: 'Napiš článek, nech ho ohodnotit a získej body!',
    icon: FileText,
    color: 'bg-primary',
    available: true,
  },
  {
    href: '/tipovacky',
    title: 'Tipovačky',
    description: 'Tipuj odpovědi na otázky a soutěž o body!',
    icon: HelpCircle,
    color: 'bg-accent',
    available: true,
  },
  {
    href: '/fotosoutez',
    title: 'Fotosoutěž',
    description: 'Nahraj fotky dle zadání a sbírej hodnocení!',
    icon: Camera,
    color: 'bg-success',
    available: false,
  },
  {
    href: '/obchudek',
    title: 'Obchůdek',
    description: 'Nakupuj, prodávej a směňuj za body!',
    icon: ShoppingBag,
    color: 'bg-secondary',
    available: true,
  },
];

interface Stats {
  users: number;
  articles: number;
  ratings: number;
  points: number;
}

export default function Index() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ users: 0, articles: 0, ratings: 0, points: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [profilesRes, articlesRes, ratingsRes] = await Promise.all([
      supabase.from('profiles').select('id, points'),
      supabase.from('articles').select('id').eq('status', 'published'),
      supabase.from('article_ratings').select('id'),
    ]);

    const totalPoints = (profilesRes.data || []).reduce((sum, p) => sum + p.points, 0);

    setStats({
      users: profilesRes.data?.length || 0,
      articles: articlesRes.data?.length || 0,
      ratings: ratingsRes.data?.length || 0,
      points: totalPoints,
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-[10%] w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-[15%] w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 right-[30%] w-24 h-24 bg-success/20 rounded-full blur-2xl animate-pulse-slow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-secondary-foreground">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Vítej v soutěži!</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold mb-6 animate-slide-up">
              <span className="text-primary">Lopiho</span>{' '}
              <span className="text-secondary-foreground">Soutěž</span>
            </h1>
            
            <p className="text-lg md:text-xl text-secondary-foreground/80 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Sbírej body za články, tipy a fotky. Nakupuj v obchůdku a staň se vítězem!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {user ? (
                <Link to="/clankovnice">
                  <Button variant="hero" size="xl" className="gap-2">
                    <FileText className="w-5 h-5" />
                    Začít soutěžit
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button variant="hero" size="xl" className="gap-2">
                    <Trophy className="w-5 h-5" />
                    Připojit se
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, label: 'Soutěžících', value: stats.users },
              { icon: FileText, label: 'Publikovaných článků', value: stats.articles },
              { icon: Star, label: 'Hodnocení', value: stats.ratings },
              { icon: Coins, label: 'Rozdáno bodů', value: stats.points },
            ].map((stat, i) => (
              <Card key={i} className="text-center card-hover border-0 shadow-card">
                <CardContent className="pt-6">
                  <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Categories */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Kategorie soutěže
                </h2>
                <p className="text-muted-foreground max-w-xl">
                  Vyber si kategorii a začni sbírat body. Každá kategorie má svá pravidla a odměny!
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {categories.map((category, i) => (
                  <Card 
                    key={i} 
                    className={`card-hover border-0 shadow-card overflow-hidden ${!category.available && 'opacity-60'}`}
                  >
                    <CardHeader className="pb-4">
                      <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center mb-4 shadow-card`}>
                        <category.icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        {category.title}
                        {!category.available && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground font-normal">
                            Brzy
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {category.available ? (
                        <Link to={category.href}>
                          <Button variant="outline" className="w-full gap-2">
                            Otevřít
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" className="w-full" disabled>
                          Připravujeme
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div>
              <Leaderboard />
            </div>
          </div>
        </div>
      </section>

      {/* Published Articles */}
      <PublishedArticlesCarousel />

      {/* How Points Work */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Jak fungují body?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Body získáváš za kvalitní příspěvky. Čím lepší hodnocení, tím více bodů!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center shadow-card">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-display font-bold mb-2">Vytvoř příspěvek</h3>
                <p className="text-sm text-muted-foreground">
                  Napiš článek, nahraj fotku nebo tipni odpověď
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-card">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-display font-bold mb-2">Nech se ohodnotit</h3>
                <p className="text-sm text-muted-foreground">
                  Ostatní soutěžící hodnotí tvůj příspěvek 1-10
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-card">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-display font-bold mb-2">Získej body</h3>
                <p className="text-sm text-muted-foreground">
                  Organizátor přidělí body dle hodnocení
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-secondary-foreground mb-4">
              Připraven soutěžit?
            </h2>
            <p className="text-secondary-foreground/80 mb-8 max-w-xl mx-auto">
              Zaregistruj se zdarma a začni sbírat body ještě dnes!
            </p>
            <Link to="/auth">
              <Button variant="hero" size="xl" className="gap-2">
                <Trophy className="w-5 h-5" />
                Vytvořit účet
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2024 Lopiho Soutěž. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </div>
  );
}
