-- Table for storing rules and privacy policy content
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view site content"
ON public.site_content
FOR SELECT
USING (true);

-- Only organizers can update
CREATE POLICY "Organizers can update site content"
ON public.site_content
FOR UPDATE
USING (has_role(auth.uid(), 'organizer'::app_role));

-- Only organizers can insert
CREATE POLICY "Organizers can insert site content"
ON public.site_content
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'organizer'::app_role));

-- Table for deletion requests
CREATE TABLE public.deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create own deletion requests"
ON public.deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own deletion requests"
ON public.deletion_requests
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'organizer'::app_role));

-- Organizers can update requests
CREATE POLICY "Organizers can update deletion requests"
ON public.deletion_requests
FOR UPDATE
USING (has_role(auth.uid(), 'organizer'::app_role));

-- Insert default content
INSERT INTO public.site_content (key, content) VALUES 
('pravidla', 'Zde budou pravidla soutěže...'),
('ochrana_ou', 'Zde budou informace o ochraně osobních údajů...');