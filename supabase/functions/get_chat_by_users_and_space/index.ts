
// Follow this setup guide to integrate the Deno runtime and your Edge Functions: https://deno.land/manual/runtime/manual/deploy_deno
// Supabase Edge Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Parse the request body
    const body = await req.json()
    const { current_user_id, space_owner_id, current_space_id, include_deleted } = body
    
    console.log("Request body:", body)

    // Validating required parameters
    if (!current_user_id || !space_owner_id || !current_space_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log("Querying for existing chats with:", { 
      current_user_id, 
      space_owner_id, 
      current_space_id,
      include_deleted
    })

    // Query para verificar se existe um chat entre esses usuários para esse espaço
    let query = supabaseClient
      .from('chats')
      .select('id, deleted')
      .eq('space_id', current_space_id)
      .or(`and(user_id.eq.${current_user_id},owner_id.eq.${space_owner_id}),and(user_id.eq.${space_owner_id},owner_id.eq.${current_user_id})`)
    
    // Se include_deleted não for true, então filtramos apenas os não excluídos
    if (!include_deleted) {
      query = query.is('deleted', false)
    }
    
    const { data: chats, error } = await query

    if (error) {
      console.error("Database query error:", error)
      return new Response(
        JSON.stringify({ error: 'Error querying database' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    console.log("Query result:", chats)

    return new Response(
      JSON.stringify(chats),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error("Error:", error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
