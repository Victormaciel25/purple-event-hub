-- Revert: remove public-only view/function and restore public SELECT on spaces

-- 1) Drop spaces_public (view or table) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'spaces_public'
  ) THEN
    EXECUTE 'DROP VIEW public.spaces_public CASCADE';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spaces_public'
  ) THEN
    EXECUTE 'DROP TABLE public.spaces_public CASCADE';
  END IF;
END $$;

-- 2) Drop function get_public_spaces if present
DROP FUNCTION IF EXISTS public.get_public_spaces() CASCADE;

-- 3) Restore public read access to approved spaces
-- Ensure anon can SELECT approved rows
CREATE POLICY IF NOT EXISTS "Public can view approved spaces"
ON public.spaces
FOR SELECT
TO anon
USING (status = 'approved'::space_approval_status);

-- Optionally ensure roles have SELECT privilege (RLS still applies)
GRANT SELECT ON public.spaces TO anon, authenticated;