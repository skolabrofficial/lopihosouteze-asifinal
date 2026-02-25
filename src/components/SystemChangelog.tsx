import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, ScrollText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const CATEGORIES = {
  major: { label: 'Větší úpravy', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
  minor: { label: 'Menší úpravy', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  partial: { label: 'Částečné úpravy', color: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  aesthetic: { label: 'Estetické úpravy', color: 'bg-purple-500/20 text-purple-700 border-purple-500/30' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  category: CategoryKey;
  created_by: string | null;
  created_at: string;
  author_username?: string;
}

interface SystemChangelogProps {
  isAdmin?: boolean;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/system_changelog`;

export default function SystemChangelog({ isAdmin = false }: SystemChangelogProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', description: '', category: 'minor' as CategoryKey });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}?order=created_at.desc`, { headers });
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          setTableExists(false);
          setLoading(false);
          return;
        }
        throw new Error('Fetch failed');
      }
      const data = await res.json();

      if (data && data.length > 0) {
        const authorIds = [...new Set(data.filter((e: any) => e.created_by).map((e: any) => e.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds as string[]);
        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

        setEntries(data.map((e: any) => ({
          ...e,
          category: (e.category as CategoryKey) || 'minor',
          author_username: e.created_by ? profileMap.get(e.created_by) || 'Neznámý' : 'Systém',
        })));
      } else {
        setEntries([]);
      }
    } catch {
      setTableExists(false);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newEntry.title.trim()) {
      toast.error('Zadej název změny');
      return;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          title: newEntry.title.trim(),
          description: newEntry.description.trim() || null,
          category: newEntry.category,
          created_by: user?.id,
        }),
      });

      if (!res.ok) throw new Error('Insert failed');
      toast.success('Záznam přidán');
      setNewEntry({ title: '', description: '', category: 'minor' });
      setDialogOpen(false);
      fetchEntries();
    } catch {
      toast.error('Chyba při ukládání');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Záznam smazán');
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      toast.error('Chyba při mazání');
    }
  };

  if (!tableExists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            SVN – Systémové verze a novinky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tabulka <code>system_changelog</code> zatím neexistuje. Je potřeba ji vytvořit v backendu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          SVN – Systémové verze a novinky
        </CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Přidat záznam
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Žádné záznamy</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const cat = CATEGORIES[entry.category] || CATEGORIES.minor;
              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs ${cat.color}`}>{cat.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                      </span>
                      <span className="text-xs text-muted-foreground">— {entry.author_username}</span>
                    </div>
                    <h4 className="font-semibold text-sm">{entry.title}</h4>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový záznam SVN</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v as CategoryKey })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Název</Label>
                <Input
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  placeholder="Co se změnilo?"
                />
              </div>
              <div className="space-y-2">
                <Label>Popis (volitelné)</Label>
                <Textarea
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="Podrobnosti změny..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="ml-1">Přidat</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
