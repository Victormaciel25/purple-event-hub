
-- Create a security definer function to check if a user has a specific role
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID, requested_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = $1 AND role = $2
  );
END;
$$;

-- Update or create the has_role function to use the non-recursive approach
CREATE OR REPLACE FUNCTION public.has_role(requested_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.check_user_role(auth.uid(), requested_role);
END;
$$;

-- Create a function to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = email_input;
  
  RETURN user_id;
END;
$$;

-- Add function to config.toml to make it accessible via RPC
