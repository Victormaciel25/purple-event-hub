-- Fix RLS recursion on user_roles by replacing self-referential policies
-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic/duplicate policies
DROP POLICY IF EXISTS "Allow SELECT on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow select user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can see own roles" ON public.user_roles;

-- Recreate non-recursive, principle-of-least-privilege policies using security definer function

-- Users can see only their own roles
CREATE POLICY "Users can see own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can view all roles (non-recursive via security definer function)
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role('super_admin'));

-- Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('super_admin'));

-- Super admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role('super_admin'))
WITH CHECK (public.has_role('super_admin'));

-- Super admins can delete roles
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role('super_admin'));