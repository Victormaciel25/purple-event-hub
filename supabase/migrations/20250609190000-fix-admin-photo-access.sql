
-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Enable read access for all users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users on spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users on spaces bucket" ON storage.objects;

-- Criar política de leitura pública para o bucket spaces
CREATE POLICY "Public read access to spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

-- Permitir que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload to spaces bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

-- Permitir que proprietários atualizem suas próprias fotos
CREATE POLICY "Users can update their own files in spaces bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que proprietários deletem suas próprias fotos
CREATE POLICY "Users can delete their own files in spaces bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.uid()::text = (storage.foldername(name))[1]);
