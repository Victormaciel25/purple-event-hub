-- Remover todas as políticas duplicadas do bucket spaces
DROP POLICY IF EXISTS "Allow public read access to spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update in spaces" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from spaces" ON storage.objects;
DROP POLICY IF EXISTS "Public access to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from spaces bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for space photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload space photos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode visualizar imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias imagens" ON storage.objects;

-- Criar políticas simples e funcionais
CREATE POLICY "Allow public read access to spaces bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

CREATE POLICY "Allow authenticated users upload to spaces bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users update in spaces bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users delete from spaces bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);