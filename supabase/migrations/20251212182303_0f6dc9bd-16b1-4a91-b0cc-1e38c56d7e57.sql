-- Create shop items table
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price integer NOT NULL DEFAULT 0,
  stock integer DEFAULT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create purchases table
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  total_price integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Shop items policies
CREATE POLICY "Anyone can view active shop items"
ON public.shop_items FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can manage shop items"
ON public.shop_items FOR ALL
USING (has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));

-- Purchases policies
CREATE POLICY "Users can view own purchases"
ON public.purchases FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));

CREATE POLICY "Users can create purchases"
ON public.purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers can update purchases"
ON public.purchases FOR UPDATE
USING (has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));

-- Trigger for updated_at
CREATE TRIGGER update_shop_items_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();