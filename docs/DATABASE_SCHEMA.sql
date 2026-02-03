-- =====================================================
-- KOMPLETNÍ DATABÁZOVÉ SCHÉMA - LOPIHO SOUTĚŽ
-- =====================================================
-- Generováno: 2026-01-10
-- Verze: 1.0
-- =====================================================

-- ==================== ENUMY ====================

-- Role uživatelů
CREATE TYPE public.app_role AS ENUM ('user', 'helper', 'organizer');

-- Stav článků
CREATE TYPE public.article_status AS ENUM ('pending', 'approved', 'rejected', 'rated', 'published');

-- Stav tipovacích her
CREATE TYPE public.guessing_game_status AS ENUM ('active', 'closed', 'resolved');

-- ==================== TABULKY ====================

-- Profily uživatelů
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  points INTEGER DEFAULT 0 NOT NULL,
  bio TEXT,
  gender TEXT,
  for_fun BOOLEAN DEFAULT false, -- Hraje jen pro zábavu (nesoutěží o výhry)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Role uživatelů (odděleno od profilů pro bezpečnost)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Články (Článkovnice)
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status article_status DEFAULT 'pending' NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Hodnocení článků
CREATE TABLE public.article_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (article_id, user_id)
);

-- Tipovačky
CREATE TABLE public.guessing_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  image_url TEXT,
  correct_answer TEXT,
  status guessing_game_status DEFAULT 'active' NOT NULL,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  closed_at TIMESTAMPTZ
);

-- Tipy v tipovačkách
CREATE TABLE public.guessing_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.guessing_games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tip TEXT NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (game_id, user_id)
);

-- Interní zprávy
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Položky v obchůdku
CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Nákupy (funguje jako inventář - status 'delivered' = v inventáři)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'delivered', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Obsah stránek (pravidla, ochrana OU)
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- Žádosti o smazání dat
CREATE TABLE public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- ==================== STORAGE ====================

-- Bucket pro obrázky tipovačk a avatary
INSERT INTO storage.buckets (id, name, public) VALUES ('tipovacky', 'tipovacky', true);

-- ==================== FUNKCE ====================

-- Kontrola role uživatele
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Automatické vytvoření profilu při registraci
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Aktualizace updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==================== TRIGGERY ====================

-- Trigger pro nového uživatele
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggery pro updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_items_updated_at
  BEFORE UPDATE ON public.shop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================

-- Povolit RLS na všech tabulkách
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guessing_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guessing_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- ========== Profiles ==========
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== User Roles ==========
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'organizer'));

-- ========== Articles ==========
CREATE POLICY "Anyone can view approved/published articles" ON public.articles
  FOR SELECT USING (status IN ('approved', 'rated', 'published') OR author_id = auth.uid() OR public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Users can create articles" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own pending articles" ON public.articles
  FOR UPDATE USING (auth.uid() = author_id AND status = 'pending');

CREATE POLICY "Organizers can update articles" ON public.articles
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can delete articles" ON public.articles
  FOR DELETE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- ========== Article Ratings ==========
CREATE POLICY "Users can view ratings" ON public.article_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can rate approved articles" ON public.article_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating" ON public.article_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== Guessing Games ==========
CREATE POLICY "Anyone can view active and resolved games" ON public.guessing_games
  FOR SELECT USING (status IN ('active', 'resolved') OR public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can create games" ON public.guessing_games
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can update games" ON public.guessing_games
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- ========== Guessing Tips ==========
CREATE POLICY "Users can view tips after game is resolved" ON public.guessing_tips
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guessing_games WHERE id = game_id AND status = 'resolved')
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'organizer')
    OR public.has_role(auth.uid(), 'helper')
  );

CREATE POLICY "Users can create tips for active games" ON public.guessing_tips
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (SELECT 1 FROM public.guessing_games WHERE id = game_id AND status = 'active')
  );

CREATE POLICY "Users can update own tips for active games" ON public.guessing_tips
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (SELECT 1 FROM public.guessing_games WHERE id = game_id AND status = 'active')
  );

CREATE POLICY "Organizers can update tips" ON public.guessing_tips
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- ========== Messages ==========
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Organizers can send messages" ON public.messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can view sent messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id);

-- ========== Shop Items ==========
CREATE POLICY "Anyone can view active shop items" ON public.shop_items
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can manage shop items" ON public.shop_items
  FOR ALL USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- ========== Purchases ==========
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Users can create purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organizers can create purchases (gifts)" ON public.purchases
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can update purchases" ON public.purchases
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- ========== Site Content ==========
CREATE POLICY "Anyone can view site content" ON public.site_content
  FOR SELECT USING (true);

CREATE POLICY "Organizers can update site content" ON public.site_content
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can insert site content" ON public.site_content
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'organizer'));

-- ========== Deletion Requests ==========
CREATE POLICY "Users can create own deletion requests" ON public.deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests" ON public.deletion_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can update deletion requests" ON public.deletion_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer'));

-- ========== Storage Policies ==========
CREATE POLICY "Anyone can view tipovacky images" ON storage.objects
  FOR SELECT USING (bucket_id = 'tipovacky');

CREATE POLICY "Organizers can upload tipovacky images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tipovacky' 
    AND (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'))
  );

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tipovacky' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Organizers can delete tipovacky images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tipovacky' 
    AND (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'))
  );

-- ==================== VÝCHOZÍ DATA ====================

-- Výchozí obsah stránek
INSERT INTO public.site_content (key, content) VALUES 
('pravidla', 'Zde budou pravidla soutěže...'),
('ochrana_ou', 'Zde budou informace o ochraně osobních údajů...');
