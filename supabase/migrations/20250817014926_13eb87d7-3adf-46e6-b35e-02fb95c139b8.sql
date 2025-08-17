-- Secure sensitive columns in spaces by preventing anon direct reads

-- 1) Drop the existing public policy
DROP POLICY IF EXISTS "Users can view approved spaces" ON public.spaces;

-- 2) Create authenticated-only policy
CREATE POLICY "Authenticated can view approved or own spaces"
ON public.spaces
FOR SELECT
USING (
  auth.role() = 'authenticated' AND ((status = 'approved'::space_approval_status) OR (auth.uid() = user_id))
);

-- 3) Create a SECURITY DEFINER function to expose only non-sensitive fields publicly
CREATE OR REPLACE FUNCTION public.get_public_spaces()
RETURNS TABLE(
  id uuid,
  name text,
  state text, 
  description text,
  price text,
  capacity text,
  categories text[],
  latitude numeric,
  longitude numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id, s.name, s.state, s.description, s.price, s.capacity, s.categories, s.latitude, s.longitude, s.created_at
  FROM public.spaces s
  WHERE s.status = 'approved'::space_approval_status;
$$;

-- 4) Create a view that selects from the function (so anon can read safely)
CREATE OR REPLACE VIEW public.spaces_public AS
SELECT * FROM public.get_public_spaces();

-- 5) Grant access to the view for both anon and authenticated roles
GRANT SELECT ON public.spaces_public TO anon, authenticated;