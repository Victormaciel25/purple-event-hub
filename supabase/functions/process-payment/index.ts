
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

// For client operations, use the anon key
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Mercado Pago API configuration
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('ACCESS_TOKEN') || 'TEST-72418442407574-032019-06b36295f414c18196c22b750c1afb56-334101838';

// Generate a unique idempotency key
function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Process payment handler
async function processPayment(req: Request) {
  try {
    const requestData = await req.json();
    
    const { 
      payment_type = 'credit_card',
      token, 
      issuer_id, 
      payment_method_id, 
      transaction_amount, 
      installments, 
      email, 
      identification,
      space_id,
      plan_id,
      user_id,
      description,
      preference_id
    } = requestData;

    console.log(`Processing ${payment_type} payment with data:`, {
      payment_type,
      token: token ? "***" : undefined,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      email,
      space_id,
      plan_id,
      user_id,
      description,
      preference_id
    });

    // Validate required fields for all payment types
    if (!user_id || !space_id || !plan_id) {
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

    // Check if we have a valid Mercado Pago token
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
    
    // Different payload based on payment type and whether we have a preference
    let mpRequestData;
    let endpoint = "payments";
    
    if (preference_id) {
      // Check if this is a test preference
      if (preference_id.startsWith('test-preference-')) {
        // For test preferences, we'll simulate an approved payment
        const paymentId = `test-payment-${Date.now()}`;
        const amount = transaction_amount || 100;
        
        // Calculate expiration based on plan
        let expiresAt = null;
        if (plan_id === 'daily') {
          expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 1 day
        } else if (plan_id === 'weekly') {
          expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        } else if (plan_id === 'monthly') {
          expiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
        
        // Update the promotion record with payment information
        const { data: updateData, error: updateError } = await supabase
          .from('space_promotions')
          .update({
            payment_id: paymentId,
            payment_status: 'approved',
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .eq('preference_id', preference_id)
          .select();
        
        if (updateError) {
          console.error("Error updating promotion with payment info:", updateError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            payment_id: paymentId,
            status: 'approved'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // If we have a preference ID, we'll use it to process the payment
      mpRequestData = {
        preference_id: preference_id
      };
      
      if (payment_method_id) {
        mpRequestData.payment_method_id = payment_method_id;
      }
      
      if (token) {
        mpRequestData.token = token;
      }
      
      if (installments) {
        mpRequestData.installments = parseInt(installments);
      }
      
      if (email) {
        mpRequestData.payer = { email };
      }
    } else if (payment_type === 'pix') {
      // PIX payment payload
      mpRequestData = {
        transaction_amount: parseFloat(transaction_amount),
        description: description || `Space promotion: ${plan_id}`,
        payment_method_id: 'pix',
        payer: {
          email,
          identification: identification || {}
        },
        metadata: {
          space_id,
          plan_id,
          user_id
        }
      };
    } else {
      // Credit card payment payload
      if (!token || !payment_method_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing required credit card payment information" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      mpRequestData = {
        token,
        issuer_id,
        payment_method_id,
        transaction_amount: parseFloat(transaction_amount),
        installments: parseInt(installments || '1'),
        description: description || `Space promotion: ${plan_id}`,
        payer: {
          email,
          identification
        },
        additional_info: {
          items: [
            {
              id: space_id,
              title: `Space promotion plan ${plan_id}`,
              description: `Promotion for space ID ${space_id}`,
              quantity: 1,
              unit_price: parseFloat(transaction_amount)
            }
          ]
        },
        notification_url: "https://your-app-url.com/api/notifications/mercadopago",
        statement_descriptor: "iParty Spaces",
        capture: true,
        binary_mode: true
      };
    }
    
    console.log("Sending request to Mercado Pago API:", JSON.stringify(mpRequestData));

    // Generate a unique idempotency key for this request
    const idempotencyKey = generateIdempotencyKey();

    // In test mode, we'll simulate a successful payment response
    // This code will execute when MERCADO_PAGO_ACCESS_TOKEN starts with "TEST-"
    // You'd replace this with actual API calls in production
    let mpResponse;
    let mpData;

    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode with simulated successful response");
      
      // Different test response based on payment type
      if (payment_type === 'pix') {
        // Simulated PIX response
        mpData = {
          id: `pix-test-${Date.now()}`,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          transaction_details: {
            net_received_amount: parseFloat(transaction_amount || "0")
          },
          date_created: new Date().toISOString(),
          date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours expiration
          payer: { email },
          point_of_interaction: {
            type: "PIX",
            application_data: {
              name: "TEST_SDK",
              version: "1.0.0"
            },
            transaction_data: {
              qr_code_base64: "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",
              qr_code: "00020126600014br.gov.bcb.pix0117john@testgmail.com0217additional data52040000530398654051000.005802BR5913Maria Silva6008Brasilia62070503***6304E2CA",
              ticket_url: "https://www.mercadopago.com.br/payments/123456789/ticket"
            }
          }
        };
      } else {
        // Simulated credit card response
        mpData = {
          id: `test-${Date.now()}`,
          status: "approved",
          status_detail: "accredited",
          transaction_details: {
            net_received_amount: parseFloat(transaction_amount || "0")
          },
          date_created: new Date().toISOString(),
          payer: { email }
        };
      }
      
      mpResponse = {
        ok: true,
        status: 200,
        json: async () => mpData
      } as Response;
    } else {
      // Real API call with idempotency key
      mpResponse = await fetch(`https://api.mercadopago.com/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(mpRequestData)
      });
      
      mpData = await mpResponse.json();
    }
    
    console.log("Mercado Pago API response:", JSON.stringify(mpData));

    // Check if payment API call was successful
    if (mpResponse.ok) {
      try {
        // Calculate expiration based on plan
        let expiresAt = null;
        if (plan_id === 'daily') {
          expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 1 day
        } else if (plan_id === 'weekly') {
          expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        } else if (plan_id === 'monthly') {
          expiresAt = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
        
        let insertOrUpdateData;
        
        // If we have a preference ID, we update the existing record
        if (preference_id) {
          console.log("Updating space_promotions table with payment data:", {
            payment_id: mpData.id,
            payment_status: mpData.status,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          });
          
          const { data, error } = await supabase
            .from('space_promotions')
            .update({
              payment_id: mpData.id,
              payment_status: mpData.status,
              expires_at: expiresAt ? expiresAt.toISOString() : null
            })
            .eq('preference_id', preference_id)
            .select();
          
          insertOrUpdateData = data;
          
          if (error) {
            console.error("Error updating payment record:", error);
            throw error;
          }
        } else {
          // Insert directly using service role client to bypass RLS
          console.log("Inserting into space_promotions table with data:", {
            space_id,
            plan_id,
            payment_id: mpData.id,
            payment_status: mpData.status,
            amount: transaction_amount,
            user_id,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          });
          
          const { data, error } = await supabase
            .from('space_promotions')
            .insert({
              space_id,
              plan_id,
              payment_id: mpData.id,
              payment_status: mpData.status,
              amount: transaction_amount,
              user_id,
              expires_at: expiresAt ? expiresAt.toISOString() : null
            })
            .select();
  
          insertOrUpdateData = data;
          
          if (error) {
            console.error("Error storing payment:", error);
            throw error;
          }
        }

        console.log("Database operation result:", insertOrUpdateData);

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
      } catch (dbProcessingError) {
        console.error("Error in database processing:", dbProcessingError);
        
        // Payment was successful but database processing failed
        return new Response(
          JSON.stringify({ 
            success: true, 
            payment_id: mpData.id,
            status: mpData.status,
            warning: "Payment processed but record keeping failed: " + (dbProcessingError instanceof Error ? dbProcessingError.message : String(dbProcessingError)),
            point_of_interaction: mpData.point_of_interaction
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Payment failed
      console.error("Payment processing failed:", mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || "Payment processing failed",
          details: mpData
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
      JSON.stringify({ 
        success: false, 
        error: "Server error processing payment",
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

  // Process the payment
  return processPayment(req);
});
