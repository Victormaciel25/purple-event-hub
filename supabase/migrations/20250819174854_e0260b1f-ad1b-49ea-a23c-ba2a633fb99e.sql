-- Add vendor-related columns to chats table
ALTER TABLE public.chats 
ADD COLUMN vendor_id uuid,
ADD COLUMN vendor_name text,
ADD COLUMN vendor_image text;

-- Add index for vendor_id for better performance
CREATE INDEX idx_chats_vendor_id ON public.chats(vendor_id);