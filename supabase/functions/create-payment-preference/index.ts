
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with service role key to bypass RLS policies
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mercado Pago API configuration
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('ACCESS_TOKEN') || 'TEST-72418442407574-032019-06b36295f414c18196c22b750c1afb56-334101838';

// Generate a unique idempotency key
function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Create payment preference handler
async function createPaymentPreference(req: Request) {
  try {
    const requestData = await req.json();
    
    const { 
      space_id,
      plan_id,
      user_id,
      amount,
      description
    } = requestData;

    console.log(`Creating payment preference:`, {
      space_id,
      plan_id,
      user_id,
      amount,
      description
    });

    // Validate required fields
    if (!amount || !user_id || !space_id || !plan_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required information" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if we have a valid Mercado Pago access token
    if (!MERCADO_PAGO_ACCESS_TOKEN || MERCADO_PAGO_ACCESS_TOKEN === '') {
      console.error("Missing Mercado Pago access token");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuration error: Missing payment processor credentials"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Generate a unique idempotency key for this request
    const idempotencyKey = generateIdempotencyKey();

    // In test mode, simulate a successful preference creation
    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode with simulated successful preference");
      
      // Create a test preference ID
      const testPreferenceId = `test-preference-${Date.now()}`;
      
      // Store the preference in the database
      const { data: insertData, error: dbError } = await supabase
        .from('space_promotions')
        .insert({
          space_id,
          plan_id,
          preference_id: testPreferenceId,
          payment_status: 'pending',
          amount: amount,
          user_id,
          expires_at: null
        })
        .select();
        
      if (dbError) {
        console.error("Error storing preference:", dbError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to store payment preference: " + dbError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          id: testPreferenceId 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create preference payload
    const preferenceData = {
      items: [
        {
          id: space_id,
          title: `Promoção para ${plan_id}`,
          description: description || `Promoção para espaço ID ${space_id}`,
          quantity: 1,
          unit_price: parseFloat(amount),
          currency_id: "BRL"
        }
      ],
      purpose: "wallet_purchase",
      auto_return: "approved",
      external_reference: `space_id:${space_id},plan_id:${plan_id},user_id:${user_id}`,
      notification_url: "https://your-app-url.com/api/notifications/mercadopago",
      statement_descriptor: "iParty Spaces",
      metadata: {
        space_id,
        plan_id,
        user_id
      }
    };
    
    console.log("Sending request to Mercado Pago API:", JSON.stringify(preferenceData));
    
    // Make API call to Mercado Pago to create preference
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(preferenceData)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error("Error creating preference:", responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || "Failed to create payment preference" 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("Preference created successfully:", responseData);
    
    // Store the preference in the database
    const { data: insertData, error: dbError } = await supabase
      .from('space_promotions')
      .insert({
        space_id,
        plan_id,
        preference_id: responseData.id,
        payment_status: 'pending',
        amount: amount,
        user_id,
        expires_at: null
      })
      .select();
      
    if (dbError) {
      console.error("Error storing preference:", dbError);
      // We'll still return the preference ID since it was created successfully
      return new Response(
        JSON.stringify({ 
          success: true, 
          id: responseData.id,
          warning: "Preference created but failed to store in database: " + dbError.message
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        id: responseData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Error creating payment preference:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error creating payment preference",
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for this endpoint
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // Create the payment preference
  return createPaymentPreference(req);
});
