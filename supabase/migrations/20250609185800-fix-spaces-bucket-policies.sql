
-- Verificar se o bucket existe e criar se necessário
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('spaces', 'spaces', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Remover todas as políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can upload space photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own space photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all space photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to space photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can access spaces bucket" ON storage.objects;

-- Criar políticas mais específicas e permissivas para o bucket spaces
CREATE POLICY "Enable read access for all users on spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

CREATE POLICY "Enable insert for authenticated users on spaces bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update for users on spaces bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete for users on spaces bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');
