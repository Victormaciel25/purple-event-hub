
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
    // Get supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Initialize Supabase client without using auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
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
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Query for existing chats
    try {
      console.log("Querying for existing chats with:", { current_user_id, space_owner_id, current_space_id });
      
      // Query without requiring user authentication validation
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
        return new Response(
          JSON.stringify({ error: 'Database error: ' + error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
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
      return new Response(
        JSON.stringify({ error: 'Query error: ' + queryError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
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
