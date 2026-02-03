import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, ShoppingBag, Loader2, Box, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
  status: string;
  item_name: string;
  item_description: string | null;
  item_image_url: string | null;
}

export default function Inventar() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchInventory();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user) return;

    // Fetch delivered purchases as inventory items
    const { data: purchasesData, error } = await supabase
      .from('purchases')
      .select('id, item_id, quantity, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      setLoading(false);
      return;
    }

    // Fetch item details
    const itemIds = [...new Set((purchasesData || []).map(p => p.item_id))];
    
    let itemsMap = new Map<string, any>();
    if (itemIds.length > 0) {
      const { data: shopItems } = await supabase
        .from('shop_items')
        .select('id, name, description, image_url')
        .in('id', itemIds);
      
      itemsMap = new Map(shopItems?.map(i => [i.id, i]) || []);
    }

    const enrichedItems: InventoryItem[] = (purchasesData || []).map(purchase => {
      const shopItem = itemsMap.get(purchase.item_id);
      return {
        id: purchase.id,
        item_id: purchase.item_id,
        quantity: purchase.quantity,
        acquired_at: purchase.created_at,
        status: purchase.status,
        item_name: shopItem?.name || 'Neznámý předmět',
        item_description: shopItem?.description || null,
        item_image_url: shopItem?.image_url || null
      };
    });

    setItems(enrichedItems);
    setLoading(false);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Inventář</h2>
            <p className="text-muted-foreground mb-4">
              Pro zobrazení inventáře se musíš přihlásit.
            </p>
            <Link to="/auth">
              <Button>Přihlásit se</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Můj inventář</h1>
            <p className="text-muted-foreground">
              {totalItems} {totalItems === 1 ? 'předmět' : totalItems >= 2 && totalItems <= 4 ? 'předměty' : 'předmětů'}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Box className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tvůj inventář je prázdný</h2>
            <p className="text-muted-foreground mb-6">
              Nakupuj v obchůdku a po doručení se předměty objeví zde!
            </p>
            <Link to="/obchudek">
              <Button>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Jít do obchůdku
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Inventory Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card 
              key={item.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <CardContent className="p-4">
                {/* Item Image */}
                <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden relative">
                  {item.item_image_url ? (
                    <img 
                      src={item.item_image_url} 
                      alt={item.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Quantity Badge */}
                  {item.quantity > 1 && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      ×{item.quantity}
                    </Badge>
                  )}

                  {/* Delivered indicator */}
                  <Badge className="absolute top-2 left-2 bg-success text-success-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Doručeno
                  </Badge>
                </div>

                {/* Item Info */}
                <h3 className="font-semibold truncate">{item.item_name}</h3>
                
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <ShoppingBag className="w-3 h-3" />
                  <span>Nákup</span>
                  <span>•</span>
                  <span>{format(new Date(item.acquired_at), 'd. M. yyyy', { locale: cs })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.item_name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Image */}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedItem.item_image_url ? (
                    <img 
                      src={selectedItem.item_image_url} 
                      alt={selectedItem.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedItem.item_description && (
                  <p className="text-muted-foreground">{selectedItem.item_description}</p>
                )}

                {/* Details */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Doručeno
                  </Badge>
                  <Badge variant="outline">
                    Počet: {selectedItem.quantity}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Získáno: {format(new Date(selectedItem.acquired_at), 'd. MMMM yyyy', { locale: cs })}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Zavřít
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
