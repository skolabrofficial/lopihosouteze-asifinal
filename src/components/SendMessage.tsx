import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Users, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserOption {
  id: string;
  username: string;
}

export default function SendMessage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [recipient, setRecipient] = useState<string>('');
  const [sendToAll, setSendToAll] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .order('username');
    
    setUsers(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte předmět a obsah zprávy.',
        variant: 'destructive',
      });
      return;
    }

    if (!sendToAll && !recipient) {
      toast({
        title: 'Chyba',
        description: 'Vyberte příjemce zprávy.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      if (sendToAll) {
        // Send to all users
        const messages = users.map(u => ({
          sender_id: user?.id,
          recipient_id: u.id,
          subject: subject.trim(),
          content: content.trim(),
        }));

        const { error } = await supabase.from('messages').insert(messages);
        
        if (error) throw error;

        toast({
          title: 'Odesláno',
          description: `Zpráva byla odeslána ${users.length} uživatelům.`,
        });
      } else {
        // Send to single user
        const { error } = await supabase.from('messages').insert({
          sender_id: user?.id,
          recipient_id: recipient,
          subject: subject.trim(),
          content: content.trim(),
        });

        if (error) throw error;

        const recipientName = users.find(u => u.id === recipient)?.username;
        toast({
          title: 'Odesláno',
          description: `Zpráva byla odeslána uživateli @${recipientName}.`,
        });
      }

      // Reset form
      setSubject('');
      setContent('');
      setRecipient('');
      setSendToAll(false);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se odeslat zprávu.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Odeslat zprávu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Odeslat zprávu</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipient selection */}
          <div className="space-y-2">
            <Label>Příjemce</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!sendToAll ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendToAll(false)}
              >
                <User className="w-4 h-4 mr-1" />
                Jeden uživatel
              </Button>
              <Button
                type="button"
                variant={sendToAll ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendToAll(true)}
              >
                <Users className="w-4 h-4 mr-1" />
                Všichni ({users.length})
              </Button>
            </div>
          </div>

          {!sendToAll && (
            <div className="space-y-2">
              <Label>Vyberte uživatele</Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte příjemce..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      @{u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Předmět</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Předmět zprávy..."
            />
          </div>

          <div className="space-y-2">
            <Label>Obsah zprávy</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Napište zprávu..."
              rows={5}
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full">
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Odesílám...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Odeslat {sendToAll ? `všem (${users.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
