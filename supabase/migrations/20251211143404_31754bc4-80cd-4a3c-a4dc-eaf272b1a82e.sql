-- Create messages table for internal mail
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can mark their messages as read
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Organizers can send messages
CREATE POLICY "Organizers can send messages"
ON public.messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'organizer') OR has_role(auth.uid(), 'helper'));

-- Organizers can view all messages they sent
CREATE POLICY "Organizers can view sent messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id);