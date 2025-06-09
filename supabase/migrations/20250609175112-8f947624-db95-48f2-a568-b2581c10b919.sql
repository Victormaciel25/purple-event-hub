
-- Criar função RPC para admins acessarem todas as fotos de espaços
CREATE OR REPLACE FUNCTION public.admin_get_space_photos(space_id_param uuid)
RETURNS TABLE(
  id uuid,
  space_id uuid,
  storage_path text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
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
