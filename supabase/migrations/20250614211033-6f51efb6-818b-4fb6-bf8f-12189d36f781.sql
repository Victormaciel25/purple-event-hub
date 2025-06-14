-- Criar políticas para permitir acesso ao bucket 'spaces'
CREATE POLICY "Allow public read access to spaces" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

CREATE POLICY "Allow authenticated users to upload to spaces" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update in spaces" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete from spaces" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND auth.uid() IS NOT NULL);