-- OAuth transient state storage for CSRF protection
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx
  ON public.oauth_states (expires_at);

CREATE INDEX IF NOT EXISTS oauth_states_used_at_idx
  ON public.oauth_states (used_at);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
