-- Update the delete_space_with_photos function to keep chats but remove foreign key constraint
CREATE OR REPLACE FUNCTION public.delete_space_with_photos(space_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- First: Update chats to remove space_id reference (set to NULL) instead of deleting them
  UPDATE public.chats
  SET space_id = NULL, space_name = 'Espaço excluído', space_image = NULL
  WHERE space_id = space_id_param;
  
  -- Second: Delete all messages related to this space's chats (optional - keep for chat history)
  -- We'll keep the messages to preserve chat history
  
  -- Third: Delete space promotions
  DELETE FROM public.space_promotions
  WHERE space_id = space_id_param;
  
  -- Fourth: Delete space subscriptions
  DELETE FROM public.space_subscriptions
  WHERE space_id = space_id_param;
  
  -- Fifth: Delete all photos related to the space
  DELETE FROM public.space_photos
  WHERE space_id = space_id_param;
  
  -- Finally: Delete the space itself
  DELETE FROM public.spaces
  WHERE id = space_id_param;
END;
$function$;