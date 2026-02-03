import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface SecurityLog {
  id: string;
  event_type: string;
  ip_address: string | null;
  endpoint: string | null;
  user_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  username?: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  rate_limit_exceeded: { label: 'Rate Limit', color: 'bg-destructive', icon: AlertTriangle },
  csrf_missing_state: { label: 'CSRF Chyba', color: 'bg-destructive', icon: XCircle },
  oauth_token_exchange_failed: { label: 'OAuth Selhání', color: 'bg-destructive/80', icon: XCircle },
  oauth_login_success: { label: 'Přihlášení', color: 'bg-success', icon: CheckCircle },
  oauth_login_failed: { label: 'Neúspěšné přihlášení', color: 'bg-destructive/80', icon: XCircle },
  suspicious_activity: { label: 'Podezřelá aktivita', color: 'bg-yellow-500', icon: AlertTriangle },
};

export default function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/security_logs?order=created_at.desc&limit=500`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          setError('Tabulka security_logs neexistuje. Spusťte SQL migraci pro její vytvoření.');
          setLoading(false);
          return;
        }
        throw new Error('Nepodařilo se načíst logy');
      }

      const data = await response.json();
      
      // Fetch usernames for logs with user_id
      const userIds = [...new Set(data.filter((l: SecurityLog) => l.user_id).map((l: SecurityLog) => l.user_id))] as string[];
      let usernameMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      }

      const logsWithUsernames = data.map((log: SecurityLog) => ({
        ...log,
        username: log.user_id ? usernameMap.get(log.user_id) : undefined
      }));

      setLogs(logsWithUsernames);
    } catch (err) {
      console.error('Error fetching security logs:', err);
      setError(err instanceof Error ? err.message : 'Neočekávaná chyba');
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || 
      log.ip_address?.includes(searchQuery) ||
      log.event_type.includes(searchQuery.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint?.includes(searchQuery);
    
    const matchesEventType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;
    
    return matchesSearch && matchesEventType;
  });

  // Stats
  const stats = {
    total: logs.length,
    rateLimit: logs.filter(l => l.event_type === 'rate_limit_exceeded').length,
    csrfErrors: logs.filter(l => l.event_type === 'csrf_missing_state').length,
    successfulLogins: logs.filter(l => l.event_type === 'oauth_login_success').length,
    failedAttempts: logs.filter(l => 
      l.event_type === 'oauth_token_exchange_failed' || 
      l.event_type === 'oauth_login_failed'
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-medium">Chyba při načítání logů</span>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          {error.includes('neexistuje') && (
            <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  ip_address TEXT,
  endpoint TEXT,
  user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view security logs" 
  ON public.security_logs FOR SELECT 
  USING (has_role(auth.uid(), 'organizer'::app_role));`}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-4 text-center">
            <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Celkem</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.successfulLogins}</p>
            <p className="text-xs text-muted-foreground">Úspěšná přihlášení</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-4 text-center">
            <XCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.failedAttempts}</p>
            <p className="text-xs text-muted-foreground">Neúspěšné</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-4 text-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.rateLimit}</p>
            <p className="text-xs text-muted-foreground">Rate Limit</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-4 text-center">
            <XCircle className="w-6 h-6 text-destructive/80 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.csrfErrors}</p>
            <p className="text-xs text-muted-foreground">CSRF Chyby</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat podle IP, uživatele, endpointu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Typ události" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny události</SelectItem>
            <SelectItem value="oauth_login_success">Úspěšná přihlášení</SelectItem>
            <SelectItem value="oauth_token_exchange_failed">OAuth selhání</SelectItem>
            <SelectItem value="rate_limit_exceeded">Rate Limit</SelectItem>
            <SelectItem value="csrf_missing_state">CSRF chyby</SelectItem>
            <SelectItem value="suspicious_activity">Podezřelá aktivita</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Obnovit
        </Button>
      </div>

      {/* Logs Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Logy ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Žádné záznamy k zobrazení</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Čas</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>IP Adresa</TableHead>
                    <TableHead>Uživatel</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Detaily</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => {
                    const config = EVENT_TYPE_CONFIG[log.event_type] || {
                      label: log.event_type,
                      color: 'bg-muted',
                      icon: Shield
                    };
                    const IconComponent = config.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), 'dd.MM. HH:mm:ss', { locale: cs })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} gap-1`}>
                            <IconComponent className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          {log.username ? (
                            <span className="text-primary">@{log.username}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.endpoint || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredLogs.length > 100 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Zobrazeno prvních 100 z {filteredLogs.length} záznamů
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
