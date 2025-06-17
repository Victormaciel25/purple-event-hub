
-- Remover políticas restritivas existentes no bucket 'spaces'
DROP POLICY IF EXISTS "Users can insert their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update in spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from spaces" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode visualizar imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias imagens" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on spaces bucket" ON storage.objects;

-- Criar políticas mais permissivas para o bucket 'spaces'
-- Permitir leitura pública para todos os arquivos do bucket 'spaces'
CREATE POLICY "Public read access to spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload to spaces" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Authenticated users can update spaces files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Permitir deleção para usuários autenticados
CREATE POLICY "Authenticated users can delete spaces files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Garantir que o bucket seja público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'spaces';
