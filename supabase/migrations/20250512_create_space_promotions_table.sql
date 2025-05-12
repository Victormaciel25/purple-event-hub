
-- Create table to store space promotion payments
CREATE TABLE IF NOT EXISTS public.space_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  space_id UUID REFERENCES public.spaces NOT NULL,
  plan_id TEXT NOT NULL,
  payment_id TEXT,
  payment_status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Add RLS policies
ALTER TABLE public.space_promotions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see their own promotion data
CREATE POLICY "Users can view their own space promotions" 
ON public.space_promotions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own promotion data
CREATE POLICY "Users can insert their own space promotions" 
ON public.space_promotions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for improved query performance
CREATE INDEX space_promotions_space_id_idx ON public.space_promotions(space_id);
CREATE INDEX space_promotions_user_id_idx ON public.space_promotions(user_id);
