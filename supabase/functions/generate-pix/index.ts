
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

// Generate PIX handler
async function generatePix(req: Request) {
  try {
    const requestData = await req.json();
    
    const { 
      space_id,
      plan_id,
      user_id,
      preference_id,
      amount,
      description,
      email
    } = requestData;

    console.log(`Generating PIX payment for:`, {
      space_id,
      plan_id,
      user_id,
      preference_id,
      amount,
      description,
      email
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

    // In test mode, simulate a successful PIX payment
    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode with simulated successful PIX payment");
      
      // Create a test payment ID
      const testPaymentId = `pix-test-${Date.now()}`;
      
      // Calculate expiration based on plan
      let expiresAt = null;
      if (plan_id === 'daily') {
        expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 1 day
      } else if (plan_id === 'weekly') {
        expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      } else if (plan_id === 'monthly') {
        expiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
      
      // Update promotion with payment information
      if (preference_id) {
        const { data: updateData, error: updateError } = await supabase
          .from('space_promotions')
          .update({
            payment_id: testPaymentId,
            payment_status: 'pending',
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .eq('preference_id', preference_id)
          .select();
        
        if (updateError) {
          console.error("Error updating promotion with payment info:", updateError);
        }
      } else {
        // Insert new record if no preference ID
        const { data: insertData, error: insertError } = await supabase
          .from('space_promotions')
          .insert({
            space_id,
            plan_id,
            payment_id: testPaymentId,
            payment_status: 'pending',
            amount: amount,
            user_id,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .select();
        
        if (insertError) {
          console.error("Error inserting promotion record:", insertError);
        }
      }
      
      // Generate sample PIX data
      const pixData = {
        qr_code_base64: "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",
        qr_code: "00020126600014br.gov.bcb.pix0117test@example.com0217additional data52040000530398654051000.005802BR5913Test Customer6008Sao Paulo62070503***6304E2CA",
        ticket_url: "https://www.mercadopago.com.br/payments/123456789/ticket"
      };
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'pending',
          point_of_interaction: {
            transaction_data: pixData
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create PIX payment request to Mercado Pago
    const pixData = {
      transaction_amount: parseFloat(amount),
      description: description || `Space promotion: ${plan_id}`,
      payment_method_id: 'pix',
      payer: {
        email: email || `${user_id}@example.com`
      },
      metadata: {
        space_id,
        plan_id,
        user_id,
        preference_id
      }
    };
    
    console.log("Sending PIX request to Mercado Pago API:", JSON.stringify(pixData));
    
    // Make API call to Mercado Pago to create PIX payment
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(pixData)
    });
    
    const mpData = await response.json();
    
    if (!response.ok) {
      console.error("Error creating PIX payment:", mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || "Failed to create PIX payment",
          details: mpData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("PIX payment created successfully:", mpData);
    
    // Calculate expiration based on plan
    let expiresAt = null;
    if (plan_id === 'daily') {
      expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 1 day
    } else if (plan_id === 'weekly') {
      expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    } else if (plan_id === 'monthly') {
      expiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
    
    try {
      if (preference_id) {
        // Update existing promotion with payment information
        const { data: updateData, error: updateError } = await supabase
          .from('space_promotions')
          .update({
            payment_id: mpData.id,
            payment_status: mpData.status,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .eq('preference_id', preference_id)
          .select();
        
        if (updateError) {
          console.error("Error updating promotion with payment info:", updateError);
        }
      } else {
        // Insert new record
        const { data: insertData, error: insertError } = await supabase
          .from('space_promotions')
          .insert({
            space_id,
            plan_id,
            payment_id: mpData.id,
            payment_status: mpData.status,
            amount: amount,
            user_id,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .select();
        
        if (insertError) {
          console.error("Error inserting promotion record:", insertError);
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: mpData.id,
        status: mpData.status,
        point_of_interaction: mpData.point_of_interaction
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Error generating PIX payment:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error generating PIX payment",
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

  // Generate the PIX payment
  return generatePix(req);
});
