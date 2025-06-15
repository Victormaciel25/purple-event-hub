
-- Atualizar configurações do bucket 'spaces' para suportar vídeos
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/quicktime'
  ]
WHERE id = 'spaces';
