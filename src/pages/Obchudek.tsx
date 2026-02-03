import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShoppingBag, Coins, Package, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
}

interface Purchase {
  id: string;
  item_id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  item?: ShopItem;
}

export default function Obchudek() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch items
    const { data: itemsData } = await supabase
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    setItems(itemsData || []);

    // Fetch user data if logged in
    if (user) {
      const [profileRes, purchasesRes] = await Promise.all([
        supabase.from('profiles').select('points').eq('id', user.id).maybeSingle(),
        supabase.from('purchases').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      
      setUserPoints(profileRes.data?.points || 0);
      
      // Map purchases with item info
      const purchasesWithItems = (purchasesRes.data || []).map(p => ({
        ...p,
        item: itemsData?.find(i => i.id === p.item_id)
      }));
      setPurchases(purchasesWithItems);
    }

    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedItem || !user) return;

    // Pre-check (real validation happens in database function)
    if (userPoints < selectedItem.price) {
      toast.error('Nemáš dostatek bodů!');
      return;
    }

    if (selectedItem.stock !== null && selectedItem.stock <= 0) {
      toast.error('Tento předmět je vyprodán!');
      return;
    }

    setPurchasing(true);

    try {
      // Use atomic database function for race-condition-safe purchase
      // Type assertion needed because RPC function may not be in types yet
      const { data, error } = await (supabase.rpc as any)('purchase_item', {
        _user_id: user.id,
        _item_id: selectedItem.id,
        _quantity: 1
      });

      if (error) {
        console.error('Purchase RPC error:', error);
        // Fallback to legacy method if RPC doesn't exist yet
        if (error.message.includes('function') || error.code === '42883') {
          await handlePurchaseLegacy();
          return;
        }
        toast.error('Chyba při nákupu');
        setPurchasing(false);
        return;
      }

      const result = data?.[0];
      if (!result?.success) {
        toast.error(result?.message || 'Nákup se nezdařil');
        setPurchasing(false);
        return;
      }

      toast.success(`Zakoupeno: ${selectedItem.name}!`);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Chyba při nákupu');
    }
    
    setPurchasing(false);
  };

  // Legacy purchase method (fallback if RPC not available)
  const handlePurchaseLegacy = async () => {
    if (!selectedItem || !user) return;

    // Fetch fresh data to minimize race condition window
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single();

    const { data: freshItem } = await supabase
      .from('shop_items')
      .select('price, stock, is_active')
      .eq('id', selectedItem.id)
      .single();

    if (!freshProfile || !freshItem || !freshItem.is_active) {
      toast.error('Chyba při ověřování nákupu');
      setPurchasing(false);
      return;
    }

    if (freshProfile.points < freshItem.price) {
      toast.error('Nemáš dostatek bodů!');
      setPurchasing(false);
      return;
    }

    if (freshItem.stock !== null && freshItem.stock <= 0) {
      toast.error('Tento předmět je vyprodán!');
      setPurchasing(false);
      return;
    }

    // Create purchase
    const { error: purchaseError } = await supabase.from('purchases').insert({
      user_id: user.id,
      item_id: selectedItem.id,
      quantity: 1,
      total_price: freshItem.price
    });

    if (purchaseError) {
      toast.error('Chyba při nákupu');
      setPurchasing(false);
      return;
    }

    // Deduct points using fresh value
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({ points: freshProfile.points - freshItem.price })
      .eq('id', user.id);

    if (pointsError) {
      toast.error('Chyba při odečítání bodů');
      setPurchasing(false);
      return;
    }

    // Decrease stock if applicable
    if (freshItem.stock !== null) {
      await supabase
        .from('shop_items')
        .update({ stock: freshItem.stock - 1 })
        .eq('id', selectedItem.id);
    }

    toast.success(`Zakoupeno: ${selectedItem.name}!`);
    setSelectedItem(null);
    fetchData();
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center shadow-card">
                <ShoppingBag className="w-6 h-6 text-secondary-foreground" />
              </div>
              Obchůdek
            </h1>
            <p className="text-muted-foreground mt-2">
              Utrácej své body za odměny!
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Link to="/inventar">
                <Button variant="outline" className="gap-2">
                  <Package className="w-4 h-4" />
                  Můj inventář
                </Button>
              </Link>
              <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full font-semibold">
                <Coins className="w-5 h-5" />
                <span>{userPoints} bodů</span>
              </div>
            </div>
          )}
        </div>

        {!user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="w-5 h-5 text-primary" />
              <p>Pro nákupy se musíš přihlásit.</p>
            </CardContent>
          </Card>
        )}

        {items.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-display font-bold mb-2">Obchůdek je prázdný</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Momentálně nejsou k dispozici žádné položky. Zkus to později!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const outOfStock = item.stock !== null && item.stock <= 0;
              const cantAfford = user && userPoints < item.price;
              
              return (
                <Card key={item.id} className={`shadow-card overflow-hidden ${outOfStock ? 'opacity-60' : ''}`}>
                  {item.image_url && (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {outOfStock && (
                        <Badge variant="destructive">Vyprodáno</Badge>
                      )}
                    </div>
                    {item.description && (
                      <CardDescription>{item.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-success/10 text-success gap-1">
                        <Coins className="w-3 h-3" />
                        {item.price} bodů
                      </Badge>
                      {item.stock !== null && !outOfStock && (
                        <span className="text-sm text-muted-foreground">
                          Skladem: {item.stock}
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      variant={cantAfford ? "outline" : "hero"}
                      className="w-full gap-2"
                      disabled={!user || outOfStock || cantAfford}
                      onClick={() => setSelectedItem(item)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {cantAfford ? 'Málo bodů' : outOfStock ? 'Vyprodáno' : 'Koupit'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* My Purchases */}
        {user && purchases.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-display font-bold mb-6">Moje nákupy</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchases.map((purchase) => (
                <Card key={purchase.id} className="shadow-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{purchase.item?.name || 'Neznámý předmět'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={purchase.status === 'pending' ? 'bg-yellow-500' : 'bg-success'}>
                          {purchase.status === 'pending' ? 'Čeká na vyřízení' : 'Vyřízeno'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">-{purchase.total_price} bodů</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Confirmation Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Potvrdit nákup
              </DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium text-lg">{selectedItem.name}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
                  <span>Cena:</span>
                  <Badge className="bg-success text-success-foreground gap-1">
                    <Coins className="w-3 h-3" />
                    {selectedItem.price} bodů
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tvůj zůstatek:</span>
                  <span className="font-medium">{userPoints} bodů</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Po nákupu:</span>
                  <span className="font-medium text-success">{userPoints - selectedItem.price} bodů</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedItem(null)}>Zrušit</Button>
              <Button variant="hero" onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                <span className="ml-2">Koupit</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
