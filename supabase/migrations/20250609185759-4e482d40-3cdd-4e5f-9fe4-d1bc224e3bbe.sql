
-- Verificar se o bucket existe e criar se necessário
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('spaces', 'spaces', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can upload space photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own space photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all space photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to space photos" ON storage.objects;

-- Criar política simples para permitir acesso total ao bucket spaces
CREATE POLICY "Allow all operations on spaces bucket" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'spaces')
WITH CHECK (bucket_id = 'spaces');
