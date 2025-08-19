-- Add AI-related columns to messages table
ALTER TABLE public.messages 
ADD COLUMN is_ai_response boolean DEFAULT false;

-- Add AI control columns to spaces and vendors tables
ALTER TABLE public.spaces 
ADD COLUMN ai_enabled boolean DEFAULT true;

ALTER TABLE public.vendors 
ADD COLUMN ai_enabled boolean DEFAULT true;

-- Enable realtime for messages table for real-time AI responses
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;