-- Restrict public access to profiles and allow only self and admin reads
-- 1) Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2) Ensure a policy exists for users to view their own profile (if already exists, keep it)
-- Note: We won't recreate if it exists; this is just for clarity
-- CREATE POLICY "Users can view their own profile"
-- ON public.profiles
-- FOR SELECT
-- USING (auth.uid() = id);

-- 3) Allow admins and super admins to view all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.has_role('admin') OR public.has_role('super_admin'));
  END IF;
END
$$;