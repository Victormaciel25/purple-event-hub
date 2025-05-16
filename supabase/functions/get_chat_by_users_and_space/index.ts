
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing Authorization header' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    // Create supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log("Request body:", body);
    
    const { current_user_id, space_owner_id, current_space_id } = body;
    
    // Must have all parameters
    if (!current_user_id || !space_owner_id || !current_space_id) {
      console.error("Missing required parameters:", { current_user_id, space_owner_id, current_space_id });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    try {
      console.log("Querying for existing chats with:", { current_user_id, space_owner_id, current_space_id });
      
      // Check for existing non-deleted chat
      const { data: existingChats, error: existingChatsError } = await supabase
        .from('chats')
        .select('id, deleted')
        .or(
          `and(user_id.eq.${current_user_id},owner_id.eq.${space_owner_id}),` +
          `and(user_id.eq.${space_owner_id},owner_id.eq.${current_user_id})`
        )
        .eq('space_id', current_space_id);

      if (existingChatsError) {
        console.error("Database query error:", existingChatsError);
        throw existingChatsError;
      }

      console.log("Query result:", existingChats);
      
      // Filter for active chats
      const activeChats = existingChats?.filter(chat => !chat.deleted) || [];
      
      // If there's an active chat, return it
      if (activeChats.length > 0) {
        return new Response(
          JSON.stringify(activeChats),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      // If we got here, all chats are deleted or there are no chats
      // Create a new chat
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('name, space_photos(storage_path)')
        .eq('id', current_space_id)
        .single();
        
      if (spaceError) {
        console.error("Error fetching space details:", spaceError);
        throw spaceError;
      }
      
      // Get space image if available
      let spaceImage = null;
      if (spaceData?.space_photos && spaceData.space_photos.length > 0) {
        try {
          const { data: urlData } = await supabase.storage
            .from('spaces')
            .createSignedUrl(spaceData.space_photos[0].storage_path, 3600);
            
          if (urlData?.signedUrl) {
            spaceImage = urlData.signedUrl;
          }
        } catch (err) {
          console.error("Error getting signed URL for space:", err);
        }
      }
      
      // Create new chat
      const { data: newChat, error: newChatError } = await supabase
        .from('chats')
        .insert({
          user_id: current_user_id,
          owner_id: space_owner_id,
          space_id: current_space_id,
          space_name: spaceData?.name || "Espaço",
          space_image: spaceImage,
          deleted: false
        })
        .select('id')
        .single();
        
      if (newChatError) {
        console.error("Error creating new chat:", newChatError);
        throw newChatError;
      }
      
      console.log("Created new chat:", newChat);
      
      return new Response(
        JSON.stringify([newChat]),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (queryError) {
      console.error("Query execution error:", queryError);
      throw queryError;
    }

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
