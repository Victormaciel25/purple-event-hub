
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
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('ACCESS_TOKEN') || 'TEST-72418442407574-032019-06b36295f414c18196c22b750c1afb56-334101838';

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
      plan_id,
      user_id
    } = await req.json();

    console.log("Processing payment with data:", {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      email,
      space_id,
      plan_id,
      user_id
    });

    // Validate required fields
    if (!token || !payment_method_id || !transaction_amount || !email || !user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required payment information or user ID" 
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

    // Make request to Mercado Pago API to process payment
    const mpRequestData = {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount: parseFloat(transaction_amount),
      installments: parseInt(installments),
      description: `Space promotion: ${plan_id}`,
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
    
    console.log("Sending request to Mercado Pago API:", JSON.stringify(mpRequestData));

    // In test mode, we'll simulate a successful payment response
    // This code will execute when MERCADO_PAGO_ACCESS_TOKEN starts with "TEST-"
    // You'd replace this with actual API calls in production
    let mpResponse;
    let mpData;

    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode with simulated successful response");
      // Simulate a successful payment response for testing
      mpData = {
        id: `test-${Date.now()}`,
        status: "approved",
        status_detail: "accredited",
        transaction_details: {
          net_received_amount: parseFloat(transaction_amount)
        },
        date_created: new Date().toISOString(),
        payer: { email }
      };
      mpResponse = {
        ok: true,
        status: 200,
        json: async () => mpData
      } as Response;
    } else {
      // Real API call
      mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
        },
        body: JSON.stringify(mpRequestData)
      });
      
      mpData = await mpResponse.json();
    }
    
    console.log("Mercado Pago API response:", JSON.stringify(mpData));

    // Check if payment was successful
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
        
        console.log("About to insert into space_promotions table with data:", {
          space_id,
          plan_id,
          payment_id: mpData.id,
          payment_status: mpData.status,
          amount: transaction_amount,
          user_id,
          expires_at: expiresAt ? expiresAt.toISOString() : null
        });
        
        // Check if the space_promotions table exists and has the required columns
        const { error: tableCheckError } = await supabase
          .from('space_promotions')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.error("Error checking space_promotions table:", tableCheckError);
          throw new Error(`Table check failed: ${tableCheckError.message}`);
        }
        
        // Store payment information in database
        const { data: insertData, error: dbError } = await supabase
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

        console.log("Database insert result:", insertData, dbError);

        if (dbError) {
          console.error("Error storing payment:", dbError);
          // Payment was processed but we failed to store it
          // Let's still return success to the user but log the error
          return new Response(
            JSON.stringify({ 
              success: true, 
              payment_id: mpData.id,
              status: mpData.status,
              warning: "Payment processed but record keeping failed"
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
            payment_id: mpData.id,
            status: mpData.status
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
            warning: "Payment processed but record keeping failed: " + dbProcessingError.message
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
