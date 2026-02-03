import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  Trophy,
  Send,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Coins,
  Eye
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface GuessingGame {
  id: string;
  title: string;
  question: string;
  image_url: string | null;
  status: 'active' | 'closed' | 'resolved';
  correct_answer: string | null;
  winner_id: string | null;
  winner_username?: string;
  points_awarded: number;
  created_at: string;
  closed_at: string | null;
  tips_count?: number;
  my_tip?: string;
}

export default function Tipovacky() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<GuessingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GuessingGame | null>(null);
  const [myTip, setMyTip] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGames();
    }
  }, [user]);

  const fetchGames = async () => {
    setLoading(true);
    
    // Fetch games
    const { data: gamesData } = await supabase
      .from('guessing_games')
      .select('*')
      .in('status', ['active', 'resolved'])
      .order('created_at', { ascending: false });

    if (!gamesData) {
      setGames([]);
      setLoading(false);
      return;
    }

    // Fetch tips count and user's tip for each game
    const gameIds = gamesData.map(g => g.id);
    
    const { data: tipsData } = await supabase
      .from('guessing_tips')
      .select('game_id, user_id, tip')
      .in('game_id', gameIds);

    // Fetch winner usernames
    const winnerIds = gamesData.filter(g => g.winner_id).map(g => g.winner_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', winnerIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const mappedGames = gamesData.map(game => {
      const gameTips = tipsData?.filter(t => t.game_id === game.id) || [];
      const myTipData = gameTips.find(t => t.user_id === user?.id);
      
      return {
        ...game,
        tips_count: gameTips.length,
        my_tip: myTipData?.tip,
        winner_username: game.winner_id ? profileMap.get(game.winner_id) : undefined
      };
    }) as GuessingGame[];

    setGames(mappedGames);
    setLoading(false);
  };

  const handleSubmitTip = async () => {
    if (!selectedGame || !myTip.trim()) {
      toast.error('Zadej svůj tip');
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase.from('guessing_tips').upsert({
      game_id: selectedGame.id,
      user_id: user?.id,
      tip: myTip.trim(),
    });

    if (error) {
      if (error.code === '23505') {
        // Try update instead
        const { error: updateError } = await supabase
          .from('guessing_tips')
          .update({ tip: myTip.trim() })
          .eq('game_id', selectedGame.id)
          .eq('user_id', user?.id);
        
        if (updateError) {
          toast.error('Chyba při odesílání tipu');
        } else {
          toast.success('Tip aktualizován!');
          fetchGames();
        }
      } else {
        toast.error('Chyba při odesílání tipu');
      }
    } else {
      toast.success('Tip odeslán!');
      fetchGames();
    }

    setMyTip('');
    setSelectedGame(null);
    setSubmitting(false);
  };

  const activeGames = games.filter(g => g.status === 'active');
  const resolvedGames = games.filter(g => g.status === 'resolved');

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
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-card">
              <HelpCircle className="w-6 h-6 text-accent-foreground" />
            </div>
            Tipovačky
          </h1>
          <p className="text-muted-foreground mt-2">
            Tipuj odpovědi na otázky a soutěž o body!
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="w-4 h-4" />
              Aktivní ({activeGames.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Ukončené
            </TabsTrigger>
          </TabsList>

          {/* Active Games */}
          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activeGames.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné aktivní tipovačky</p>
                  <p className="text-sm text-muted-foreground mt-2">Organizátor brzy přidá nové!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeGames.map((game) => (
                  <Card key={game.id} className="card-hover overflow-hidden">
                    {game.image_url && (
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={game.image_url} 
                          alt={game.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2 bg-accent">
                          <Clock className="w-3 h-3 mr-1" />
                          Aktivní
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {game.tips_count} tipů
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium text-sm">{game.question}</p>
                      </div>

                      {game.my_tip ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Tvůj tip:</p>
                          <Badge variant="secondary" className="text-base">
                            {game.my_tip}
                          </Badge>
                          <Button 
                            variant="outline" 
                            className="w-full gap-2"
                            onClick={() => {
                              setSelectedGame(game);
                              setMyTip(game.my_tip || '');
                            }}
                          >
                            Změnit tip
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="hero" 
                          className="w-full gap-2"
                          onClick={() => {
                            setSelectedGame(game);
                            setMyTip('');
                          }}
                        >
                          <Send className="w-4 h-4" />
                          Tipnout
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Resolved Games */}
          <TabsContent value="resolved" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : resolvedGames.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Žádné ukončené tipovačky</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resolvedGames.map((game) => (
                  <Card key={game.id} className="overflow-hidden">
                    {game.image_url && (
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={game.image_url} 
                          alt={game.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                        <Badge className="absolute top-2 right-2 bg-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ukončeno
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <CardDescription>{game.question}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {game.correct_answer && (
                        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-xs text-muted-foreground mb-1">Správná odpověď:</p>
                          <p className="font-bold text-success">{game.correct_answer}</p>
                        </div>
                      )}

                      {game.winner_username && (
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            <span className="font-medium">@{game.winner_username}</span>
                          </div>
                          <Badge className="bg-success text-success-foreground">
                            +{game.points_awarded} bodů
                          </Badge>
                        </div>
                      )}

                      {game.my_tip && (
                        <div className="text-sm text-muted-foreground">
                          Tvůj tip: <span className="font-medium">{game.my_tip}</span>
                          {game.winner_id === user?.id && (
                            <Badge className="ml-2 bg-success text-success-foreground">
                              Vyhrál/a jsi!
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Tip Dialog */}
        <Dialog open={!!selectedGame} onOpenChange={(open) => !open && setSelectedGame(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-accent" />
                Tipni odpověď
              </DialogTitle>
            </DialogHeader>
            {selectedGame && (
              <div className="space-y-4 py-4">
                {selectedGame.image_url && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={selectedGame.image_url} 
                      alt={selectedGame.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div>
                  <h3 className="font-bold text-lg">{selectedGame.title}</h3>
                  <p className="text-muted-foreground mt-1">{selectedGame.question}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tip">Tvůj tip</Label>
                  <Input
                    id="tip"
                    placeholder="Zadej svou odpověď..."
                    value={myTip}
                    onChange={(e) => setMyTip(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitTip()}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedGame(null)}>
                Zrušit
              </Button>
              <Button 
                variant="hero" 
                onClick={handleSubmitTip}
                disabled={submitting || !myTip.trim()}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Odeslat tip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
