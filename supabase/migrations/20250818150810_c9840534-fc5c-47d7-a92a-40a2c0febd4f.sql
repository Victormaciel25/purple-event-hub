-- Restore schema (tables RLS + functions) aligned with current production
-- Idempotent: drop/recreate policies and recreate functions

BEGIN;

-- 1) Ensure RLS is enabled on relevant tables
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.space_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.space_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.space_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.space_deletion_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_deletion_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) FUNCTIONS (create or replace)
-- check_user_role
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, requested_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = $1 AND ur.role = $2
  );
END;
$$;

-- has_role (uses current auth.uid())
CREATE OR REPLACE FUNCTION public.has_role(requested_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.check_user_role(auth.uid(), requested_role);
END;
$$;

-- mark_notification_viewed
CREATE OR REPLACE FUNCTION public.mark_notification_viewed(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.space_deletion_notifications
  SET viewed = true
  WHERE id = notification_id
  AND user_id = auth.uid();
END;
$$;

-- mark_vendor_notification_viewed
CREATE OR REPLACE FUNCTION public.mark_vendor_notification_viewed(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.vendor_deletion_notifications
  SET viewed = true
  WHERE id = notification_id
  AND user_id = auth.uid();
END;
$$;

-- delete_space_with_photos
CREATE OR REPLACE FUNCTION public.delete_space_with_photos(space_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chats
  SET space_id = NULL, space_name = 'Espaço excluído', space_image = NULL
  WHERE space_id = space_id_param;

  DELETE FROM public.space_promotions
  WHERE space_id = space_id_param;

  DELETE FROM public.space_subscriptions
  WHERE space_id = space_id_param;

  DELETE FROM public.space_photos
  WHERE space_id = space_id_param;

  DELETE FROM public.spaces
  WHERE id = space_id_param;
END;
$$;

-- admin_get_all_spaces
CREATE OR REPLACE FUNCTION public.admin_get_all_spaces()
RETURNS TABLE(id uuid, name text, created_at timestamptz, status space_approval_status, user_id uuid, price text, profiles jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.created_at,
    s.status,
    s.user_id,
    s.price,
    jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ) as profiles
  FROM public.spaces s
  LEFT JOIN public.profiles p ON s.user_id = p.id
  ORDER BY s.created_at DESC;
END;
$$;

-- admin_get_space_photos
CREATE OR REPLACE FUNCTION public.admin_get_space_photos(space_id_param uuid)
RETURNS TABLE(id uuid, space_id uuid, storage_path text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    sp.id,
    sp.space_id,
    sp.storage_path,
    sp.created_at
  FROM public.space_photos sp
  WHERE sp.space_id = space_id_param
  ORDER BY sp.created_at ASC;
END;
$$;

-- get_user_id_by_email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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

-- handle_new_user (trigger function only; no trigger creation per current state)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    now()
  );
  RETURN NEW;
END;
$$;

-- 3) POLICIES
-- vendors
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors') THEN
    -- Drop known policy names to avoid duplicates
    DROP POLICY IF EXISTS "Allow admins to view all vendors" ON public.vendors;
    DROP POLICY IF EXISTS "Allow users to create their own vendors" ON public.vendors;
    DROP POLICY IF EXISTS "Allow users to delete their own vendors" ON public.vendors;
    DROP POLICY IF EXISTS "Allow users to update their own vendors" ON public.vendors;
    DROP POLICY IF EXISTS "Allow users to view only approved vendors" ON public.vendors;
    DROP POLICY IF EXISTS "Allow users to view their own vendors" ON public.vendors;
  END IF;
END $$;

CREATE POLICY "Allow admins to view all vendors"
ON public.vendors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

CREATE POLICY "Allow users to create their own vendors"
ON public.vendors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own vendors"
ON public.vendors
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own vendors"
ON public.vendors
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to view only approved vendors"
ON public.vendors
FOR SELECT
USING (status = 'approved'::vendor_approval_status);

CREATE POLICY "Allow users to view their own vendors"
ON public.vendors
FOR SELECT
USING (auth.uid() = user_id);

-- space_deletion_notifications
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can insert notifications" ON public.space_deletion_notifications;
  DROP POLICY IF EXISTS "Users can view their own notifications" ON public.space_deletion_notifications;
END $$;

CREATE POLICY "Admins can insert notifications"
ON public.space_deletion_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own notifications"
ON public.space_deletion_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- space_promotions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view active space promotions" ON public.space_promotions;
  DROP POLICY IF EXISTS "Users can insert their own space promotions" ON public.space_promotions;
  DROP POLICY IF EXISTS "Users can view their own space promotions" ON public.space_promotions;
END $$;

CREATE POLICY "Anyone can view active space promotions"
ON public.space_promotions
FOR SELECT
USING ((active = true) AND (expires_at > now()));

CREATE POLICY "Users can insert their own space promotions"
ON public.space_promotions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own space promotions"
ON public.space_promotions
FOR SELECT
USING (auth.uid() = user_id);

-- chats
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
  DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
  DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
END $$;

CREATE POLICY "Users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
ON public.chats
FOR UPDATE
USING ((auth.uid() = user_id) OR (auth.uid() = owner_id));

CREATE POLICY "Users can view their own chats"
ON public.chats
FOR SELECT
USING ((auth.uid() = user_id) OR (auth.uid() = owner_id));

-- spaces
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage all spaces" ON public.spaces;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON public.spaces;
  DROP POLICY IF EXISTS "Public can view approved spaces" ON public.spaces;
  DROP POLICY IF EXISTS "Users can insert their own spaces" ON public.spaces;
  DROP POLICY IF EXISTS "Users can update their own spaces" ON public.spaces;
END $$;

CREATE POLICY "Admins can manage all spaces"
ON public.spaces
FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Allow authenticated insert"
ON public.spaces
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view approved spaces"
ON public.spaces
FOR SELECT
USING (status = 'approved'::space_approval_status);

CREATE POLICY "Users can insert their own spaces"
ON public.spaces
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaces"
ON public.spaces
FOR UPDATE
USING (auth.uid() = user_id);

-- messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
  DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
END $$;

CREATE POLICY "Users can insert messages in their chats"
ON public.messages
FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT chats.id FROM public.chats
    WHERE (chats.user_id = auth.uid() OR chats.owner_id = auth.uid())
  )
);

CREATE POLICY "Users can view messages in their chats"
ON public.messages
FOR SELECT
USING (
  chat_id IN (
    SELECT chats.id FROM public.chats
    WHERE (chats.user_id = auth.uid() OR chats.owner_id = auth.uid())
  )
);

-- space_subscriptions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.space_subscriptions;
  DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.space_subscriptions;
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.space_subscriptions;
END $$;

CREATE POLICY "Users can create their own subscriptions"
ON public.space_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.space_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions"
ON public.space_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- vendor_promotions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their own vendor promotions" ON public.vendor_promotions;
  DROP POLICY IF EXISTS "Users can update their own vendor promotions" ON public.vendor_promotions;
  DROP POLICY IF EXISTS "Users can view their own vendor promotions" ON public.vendor_promotions;
END $$;

CREATE POLICY "Users can create their own vendor promotions"
ON public.vendor_promotions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor promotions"
ON public.vendor_promotions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own vendor promotions"
ON public.vendor_promotions
FOR SELECT
USING (auth.uid() = user_id);

-- user_roles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can see own roles" ON public.user_roles;
END $$;

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role('super_admin'));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role('super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role('super_admin'))
WITH CHECK (has_role('super_admin'));

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role('super_admin'));

CREATE POLICY "Users can see own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- vendor_deletion_notifications
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own vendor deletion notifications" ON public.vendor_deletion_notifications;
END $$;

CREATE POLICY "Users can view their own vendor deletion notifications"
ON public.vendor_deletion_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
END $$;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role('admin') OR has_role('super_admin'));

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- space_photos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert photos for their own spaces" ON public.space_photos;
  DROP POLICY IF EXISTS "Users can view photos of approved spaces" ON public.space_photos;
END $$;

CREATE POLICY "Users can insert photos for their own spaces"
ON public.space_photos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.spaces
    WHERE spaces.id = space_photos.space_id AND spaces.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view photos of approved spaces"
ON public.space_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.spaces
    WHERE spaces.id = space_photos.space_id
      AND (spaces.status = 'approved'::space_approval_status OR spaces.user_id = auth.uid())
  )
);

COMMIT;