
-- Enable Row Level Security
alter table "public"."space_promotions" enable row level security;

-- Add preference_id column for the payment brick flow
ALTER TABLE "public"."space_promotions"
ADD COLUMN IF NOT EXISTS "preference_id" text;

-- Create security policies
CREATE POLICY "Allow users to view their own promotions"
ON "public"."space_promotions"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow user to insert their own promotions"
ON "public"."space_promotions"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_space_promotions_user_id
ON public.space_promotions (user_id);

-- Create index on space_id
CREATE INDEX IF NOT EXISTS idx_space_promotions_space_id
ON public.space_promotions (space_id);

-- Create index on payment_id
CREATE INDEX IF NOT EXISTS idx_space_promotions_payment_id
ON public.space_promotions (payment_id);

-- Create index on preference_id
CREATE INDEX IF NOT EXISTS idx_space_promotions_preference_id
ON public.space_promotions (preference_id);
