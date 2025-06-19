
-- Remover todas as políticas RLS restritivas do bucket 'spaces'
DROP POLICY IF EXISTS "Allow public read access to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users upload to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users update in spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users delete from spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public access to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from spaces bucket" ON storage.objects;

-- Criar política muito permissiva para leitura completa
CREATE POLICY "Allow all read access to spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

-- Permitir todas as operações para usuários autenticados
CREATE POLICY "Allow all authenticated operations on spaces bucket" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Garantir que o bucket seja público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'spaces';
