import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Coins } from 'lucide-react';
import UserBadge from '@/components/UserBadge';

interface LeaderboardUser {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  roles: string[];
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, points, avatar_url')
      .order('points', { ascending: false })
      .limit(10);

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const usersWithRoles = (profiles || []).map(p => ({
      ...p,
      roles: (rolesData || []).filter(r => r.user_id === p.id).map(r => r.role)
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30';
      default:
        return 'bg-card hover:bg-muted/50';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Trophy className="w-5 h-5 text-primary" />
            Žebříček
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Trophy className="w-5 h-5 text-primary" />
            Žebříček
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Zatím žádní soutěžící
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Trophy className="w-5 h-5 text-primary" />
          Žebříček soutěžících
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.map((user, index) => {
            const rank = index + 1;
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankStyle(rank)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(rank)}
                </div>
                
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    <UserBadge username={user.username} roles={user.roles} />
                  </p>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={`gap-1 ${rank <= 3 ? 'bg-success/10 text-success' : ''}`}
                >
                  <Coins className="w-3 h-3" />
                  {user.points}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
