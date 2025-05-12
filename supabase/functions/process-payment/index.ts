
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mercado Pago API configuration
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';

// Process payment handler
async function processPayment(req: Request) {
  try {
    const { 
      token, 
      issuer_id, 
      payment_method_id, 
      transaction_amount, 
      installments, 
      email, 
      identification,
      space_id,
      plan_id
    } = await req.json();

    console.log("Processing payment with data:", {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      email,
      space_id,
      plan_id
    });

    // Validate required fields
    if (!token || !payment_method_id || !transaction_amount || !email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required payment information" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Make request to Mercado Pago API to process payment
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        token,
        issuer_id,
        payment_method_id,
        transaction_amount: parseFloat(transaction_amount),
        installments: parseInt(installments),
        description: `Space promotion: ${plan_id}`,
        payer: {
          email,
          identification
        }
      })
    });

    const mpData = await mpResponse.json();

    // Check if payment was successful
    if (mpResponse.ok) {
      // Store payment information in database
      const { error: dbError } = await supabase
        .from('space_promotions')
        .insert({
          space_id,
          plan_id,
          payment_id: mpData.id,
          payment_status: mpData.status,
          amount: transaction_amount,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) {
        console.error("Error storing payment:", dbError);
        // Payment was processed but we failed to store it
        // We should handle this case better in production
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: mpData.id,
          status: mpData.status
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      // Payment failed
      console.error("Payment processing failed:", mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || "Payment processing failed" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error processing payment" }),
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

  // Process the payment
  return processPayment(req);
});
