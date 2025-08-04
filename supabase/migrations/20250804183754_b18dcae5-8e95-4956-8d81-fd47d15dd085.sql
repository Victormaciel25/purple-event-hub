-- Add instagram column to vendors table
ALTER TABLE public.vendors 
ADD COLUMN instagram text;

-- Add instagram column to spaces table  
ALTER TABLE public.spaces
ADD COLUMN instagram text;