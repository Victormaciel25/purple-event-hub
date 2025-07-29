
-- Enable RLS on critical tables that are missing it
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fix database functions to prevent schema injection attacks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, requested_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verificar se o usuário tem a função solicitada
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = $1 AND ur.role = $2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(requested_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN public.check_user_role(auth.uid(), requested_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_viewed(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.space_deletion_notifications
  SET viewed = true
  WHERE id = notification_id
  AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_vendor_notification_viewed(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.vendor_deletion_notifications
  SET viewed = true
  WHERE id = notification_id
  AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_space_with_photos(space_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Primeira etapa: excluir todas as fotos relacionadas ao espaço
  DELETE FROM public.space_photos
  WHERE space_id = space_id_param;
  
  -- Segunda etapa: excluir o próprio espaço
  DELETE FROM public.spaces
  WHERE id = space_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_spaces()
RETURNS TABLE(id uuid, name text, created_at timestamp with time zone, status space_approval_status, user_id uuid, price text, profiles jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Retornar todos os espaços com informações do perfil
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

CREATE OR REPLACE FUNCTION public.admin_get_space_photos(space_id_param uuid)
RETURNS TABLE(id uuid, space_id uuid, storage_path text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Retornar todas as fotos do espaço especificado
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

-- Add proper RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);

-- Add input validation trigger for content moderation
CREATE OR REPLACE FUNCTION public.validate_content_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Basic content validation
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name exceeds maximum length of 200 characters';
  END IF;
  
  IF length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Description exceeds maximum length of 5000 characters';
  END IF;
  
  -- Check for suspicious patterns
  IF NEW.description ~* '(script|javascript|<\s*script|onclick|onerror|onload)' THEN
    RAISE EXCEPTION 'Content contains potentially harmful elements';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply content validation to spaces
CREATE TRIGGER spaces_content_validation
  BEFORE INSERT OR UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_content_input();

-- Apply content validation to vendors
CREATE TRIGGER vendors_content_validation
  BEFORE INSERT OR UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_content_input();
