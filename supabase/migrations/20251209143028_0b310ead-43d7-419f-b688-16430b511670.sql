-- Create enum for guessing game status
CREATE TYPE public.guessing_game_status AS ENUM ('active', 'closed', 'resolved');

-- Create guessing_games table
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

-- Create guessing_tips table
CREATE TABLE public.guessing_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.guessing_games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tip TEXT NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (game_id, user_id)
);

-- Enable RLS
ALTER TABLE public.guessing_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guessing_tips ENABLE ROW LEVEL SECURITY;

-- Guessing games policies
CREATE POLICY "Anyone can view active and resolved games" ON public.guessing_games
  FOR SELECT USING (status IN ('active', 'resolved') OR public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can create games" ON public.guessing_games
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

CREATE POLICY "Organizers can update games" ON public.guessing_games
  FOR UPDATE USING (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'));

-- Guessing tips policies
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

-- Create storage bucket for guessing game images
INSERT INTO storage.buckets (id, name, public) VALUES ('tipovacky', 'tipovacky', true);

-- Storage policies
CREATE POLICY "Anyone can view tipovacky images" ON storage.objects
  FOR SELECT USING (bucket_id = 'tipovacky');

CREATE POLICY "Organizers can upload tipovacky images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tipovacky' 
    AND (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'))
  );

CREATE POLICY "Organizers can delete tipovacky images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tipovacky' 
    AND (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'helper'))
  );