
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
    // Create supabase client with user's auth token
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log("Authenticated user:", user.id);

    // Fetch chats for this user
    // Filter to exclude deleted chats (where deleted = true)
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .eq('deleted', false) // Only get non-deleted chats
      .order('last_message_time', { ascending: false });

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} chats for user ${user.id}`);

    return new Response(
      JSON.stringify(data || []),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );

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
