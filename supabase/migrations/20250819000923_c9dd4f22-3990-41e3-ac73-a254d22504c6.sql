-- Add AI-related columns to messages table
ALTER TABLE public.messages 
ADD COLUMN is_ai_response boolean DEFAULT false;

-- Add AI control columns to spaces and vendors tables
ALTER TABLE public.spaces 
ADD COLUMN ai_enabled boolean DEFAULT true;

ALTER TABLE public.vendors 
ADD COLUMN ai_enabled boolean DEFAULT true;

-- Enable REPLICA IDENTITY for messages table (for realtime updates)
ALTER TABLE public.messages REPLICA IDENTITY FULL;