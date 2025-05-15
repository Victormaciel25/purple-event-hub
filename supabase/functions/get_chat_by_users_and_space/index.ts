
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

    // Check for existing chat with better error handling
    try {
      console.log("Querying for existing chats with:", { current_user_id, space_owner_id, current_space_id });
      
      // First, verify that the user making the request matches the current_user_id
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error("Error getting authenticated user:", userError);
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized request' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }
      
      // Verify that the current_user_id matches the authenticated user
      if (userData.user.id !== current_user_id) {
        console.error("User ID mismatch:", userData.user.id, current_user_id);
        return new Response(
          JSON.stringify({ 
            error: 'User ID mismatch' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        );
      }
      
      // Now query for existing chats
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .or(
          `and(user_id.eq.${current_user_id},owner_id.eq.${space_owner_id},space_id.eq.${current_space_id}),` +
          `and(user_id.eq.${space_owner_id},owner_id.eq.${current_user_id},space_id.eq.${current_space_id})`
        )
        .eq('deleted', false)
        .limit(1);

      if (error) {
        console.error("Database query error:", error);
        throw error;
      }

      console.log("Query result:", data);

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
