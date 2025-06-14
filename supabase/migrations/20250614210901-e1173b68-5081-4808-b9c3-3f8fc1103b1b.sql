-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Qualquer um pode visualizar imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias imagens" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias imagens" ON storage.objects;

-- Criar políticas para o bucket 'spaces'
CREATE POLICY "Qualquer um pode visualizar imagens" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

CREATE POLICY "Usuários autenticados podem fazer upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar suas próprias imagens" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem deletar suas próprias imagens" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.role() = 'authenticated');