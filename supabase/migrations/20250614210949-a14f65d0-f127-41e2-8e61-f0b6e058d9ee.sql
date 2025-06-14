-- Atualizar configurações do bucket 'spaces'
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'spaces';