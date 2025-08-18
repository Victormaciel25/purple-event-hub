-- Fix RLS on spaces to allow normal users to insert their own spaces while keeping admin access
-- 1) Drop restrictive/duplicated policies
DROP POLICY IF EXISTS "Admins can manage all spaces" ON public.spaces;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.spaces;
DROP POLICY IF EXISTS "Users can insert their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Public can view approved spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view their own spaces" ON public.spaces;

-- 2) Recreate permissive policies (default behavior) with clear separation
-- Public (anon or authed) can view approved spaces
CREATE POLICY "Public can view approved spaces"
ON public.spaces
FOR SELECT
USING (status = 'approved'::space_approval_status);

-- Authenticated users can view their own spaces (any status)
CREATE POLICY "Users can view their own spaces"
ON public.spaces
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own spaces
CREATE POLICY "Users can insert their own spaces"
ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own spaces
CREATE POLICY "Users can update their own spaces"
ON public.spaces
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins and Super Admins can select/update/delete all spaces
CREATE POLICY "Admins can view all spaces"
ON public.spaces
FOR SELECT
TO authenticated
USING (public.has_role('admin') OR public.has_role('super_admin'));

CREATE POLICY "Admins can update all spaces"
ON public.spaces
FOR UPDATE
TO authenticated
USING (public.has_role('admin') OR public.has_role('super_admin'))
WITH CHECK (true);

CREATE POLICY "Admins can delete all spaces"
ON public.spaces
FOR DELETE
TO authenticated
USING (public.has_role('admin') OR public.has_role('super_admin'));

-- Optional: allow admins to insert spaces on behalf of users if needed
CREATE POLICY "Admins can insert spaces"
ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin') OR public.has_role('super_admin'));
