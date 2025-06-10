
-- Create vendor_promotions table to track vendor promotion payments
CREATE TABLE public.vendor_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  preference_id TEXT,
  plan_id TEXT NOT NULL,
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row-Level Security
ALTER TABLE public.vendor_promotions ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor_promotions
CREATE POLICY "Users can view their own vendor promotions" 
  ON public.vendor_promotions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vendor promotions" 
  ON public.vendor_promotions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor promotions" 
  ON public.vendor_promotions 
  FOR UPDATE 
  USING (auth.uid() = user_id);
