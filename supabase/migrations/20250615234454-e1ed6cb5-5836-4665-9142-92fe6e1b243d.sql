
-- Primeiro, verificar se o bucket existe, se não, criar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spaces', 
  'spaces', 
  true, 
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/quicktime'
  ]
)
ON CONFLICT (id) 
DO UPDATE SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/quicktime'
  ];

-- Criar políticas de acesso para o bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'spaces');
CREATE POLICY "Users can insert their own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'spaces' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE USING (bucket_id = 'spaces' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (bucket_id = 'spaces' AND auth.uid()::text = (storage.foldername(name))[1]);
