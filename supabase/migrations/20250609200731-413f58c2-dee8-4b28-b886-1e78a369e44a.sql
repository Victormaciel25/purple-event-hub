
-- Verificar se o bucket existe e torná-lo público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'spaces';

-- Remover todas as políticas restritivas existentes
DROP POLICY IF EXISTS "Public read access to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on spaces bucket" ON storage.objects;

-- Criar política muito permissiva para leitura pública
CREATE POLICY "Public access to spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

-- Permitir inserção para usuários autenticados
CREATE POLICY "Authenticated users can upload to spaces bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Authenticated users can update spaces bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Permitir deleção para usuários autenticados
CREATE POLICY "Authenticated users can delete from spaces bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');
