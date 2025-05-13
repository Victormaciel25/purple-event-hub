
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main serve function
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the PUBLIC_KEY from environment variables
    const publicKey = Deno.env.get('PUBLIC_KEY');

    if (!publicKey) {
      return new Response(
        JSON.stringify({
          error: "PUBLIC_KEY not configured in Supabase secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Return the public key
    return new Response(
      JSON.stringify({ public_key: publicKey }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error retrieving PUBLIC_KEY:", error);
    
    return new Response(
      JSON.stringify({
        error: "Error retrieving Mercado Pago public key",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
