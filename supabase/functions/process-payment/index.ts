
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

// Process payment handler
async function processPayment(req: Request) {
  try {
    const requestData = await req.json();
    const { 
      token, 
      issuer_id, 
      payment_method_id,
      transaction_amount, 
      installments, 
      email, 
      identification,
      space_id,
      vendor_id,
      plan_id,
      user_id,
      payer,
      device_id
    } = requestData;

    console.log("Processing payment with data:", requestData);

    // Determine if it's a space or vendor promotion
    const isVendorPromotion = !!vendor_id;
    const entityId = vendor_id || space_id;
    const entityType = isVendorPromotion ? 'vendor' : 'space';

    // Validate required fields based on payment method
    if (payment_method_id === "pix") {
      // PIX payments require different validations
      if (!transaction_amount || !payer || !entityId || !plan_id || !user_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Missing required payment information for PIX ${entityType} promotion` 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Credit card payments require token
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

    // Prepare the base request data
    let mpRequestData: any = {
      transaction_amount: parseFloat(transaction_amount),
      description: requestData.description || `${entityType} promotion: ${plan_id}`,
      payment_method_id: payment_method_id,
      additional_info: {
        items: [
          {
            id: entityId,
            title: requestData.description || `${entityType} promotion plan ${plan_id}`,
            description: `Promotion for ${entityType} ID ${entityId}`,
            category_id: isVendorPromotion ? "vendor_service" : "event_space",
            quantity: 1,
            unit_price: parseFloat(transaction_amount)
          }
        ]
      },
      notification_url: "https://your-app-url.com/api/notifications/mercadopago",
      statement_descriptor: "iParty Vendors",
    };

    // Add device_id if available
    if (device_id) {
      mpRequestData.device_id = device_id;
    }

    // Add payment method specific data
    if (payment_method_id === "pix") {
      // PIX specific data
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 1); // 24 hours expiration

      mpRequestData = {
        ...mpRequestData,
        date_of_expiration: expirationDate.toISOString(),
        payer: payer
      };
    } else {
      // Credit card specific data
      mpRequestData = {
        ...mpRequestData,
        token,
        installments: parseInt(installments),
        issuer_id,
        payer: payer || {
          email,
          identification
        },
        capture: true,
        binary_mode: true
      };
    }
    
    console.log("Sending request to Mercado Pago API:", JSON.stringify(mpRequestData));

    // In test mode, we'll simulate a successful payment response
    // This code will execute when MERCADO_PAGO_ACCESS_TOKEN starts with "TEST-"
    // You'd replace this with actual API calls in production
    let mpResponse;
    let mpData;

    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode with simulated successful response");
      // Simulate a successful payment response for testing
      if (payment_method_id === "pix") {
        mpData = {
          id: `test-${Date.now()}`,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          transaction_details: {
            net_received_amount: parseFloat(transaction_amount)
          },
          date_created: new Date().toISOString(),
          payer: { email: payer.email },
          point_of_interaction: {
            type: "PIX",
            transaction_data: {
              qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAIAAAAP3aGbAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAIHklEQVR4nO3dwW4bORRFQcfI/3+yMYsBZmfCYWuoruJ5tHgkLm8W+vr6+voAKH0+PQDgdwQLiBMsIE6wgDjBAuIEC4gTLCBOsIA4wQLiBAvqvp8e4L99PXi9r/F6T4/wilc3/vTij3vXlbw/mxUQJ1hAnGABcYIFxAkWECdYQNzoY/Tykeunk5x+DPzPrxD957x4h4/rE1e1WQFxggXECRYQJ1hAnGABcYIFxN1yDP73fP3YeJfD10+zvepxB8q//xk2KyBOsIA4wQLiBAtIfcEQ",
              qr_code: "00020126600014br.gov.bcb.pix0117test@yourdomain.com0217additional data520400005303986540510.005802BR5913Maria Silva6008Brasilia62070503***6304E2CA",
              ticket_url: "https://www.mercadopago.com.br/payments/123456789/ticket"
            }
          }
        };
      } else {
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
      }
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
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify(mpRequestData)
      });
      
      mpData = await mpResponse.json();
    }
    
    console.log("Mercado Pago API response:", JSON.stringify(mpData));

    // Check if payment response was received successfully
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
        
        // Choose the correct table based on entity type
        const tableName = isVendorPromotion ? 'vendor_promotions' : 'space_promotions';
        const entityColumn = isVendorPromotion ? 'vendor_id' : 'space_id';
        
        console.log(`About to insert into ${tableName} table with data:`, {
          [entityColumn]: entityId,
          plan_id,
          payment_id: mpData.id,
          payment_status: mpData.status,
          amount: transaction_amount,
          user_id,
          expires_at: expiresAt ? expiresAt.toISOString() : null
        });
        
        // For PIX, record is pending until payment is confirmed
        // Insert directly using service role client to bypass RLS
        const { data: insertData, error: dbError } = await supabase
          .from(tableName)
          .insert({
            [entityColumn]: entityId,
            plan_id,
            payment_id: mpData.id,
            payment_status: mpData.status,
            amount: transaction_amount,
            user_id,
            expires_at: expiresAt ? expiresAt.toISOString() : null
          })
          .select();

        console.log(`Database insert result for ${tableName}:`, insertData, dbError);

        if (dbError) {
          console.error("Error storing payment:", dbError);
          
          // Return the payment data even if record keeping failed
          return new Response(
            JSON.stringify({ 
              success: true, 
              payment_id: mpData.id,
              status: mpData.status,
              warning: "Payment processed but record keeping failed: " + dbError.message,
              ...mpData // Return all payment processor data
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        // Log the full payment data for debugging
        console.log("Payment processed successfully. Full response:", JSON.stringify(mpData));
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            payment_id: mpData.id,
            status: mpData.status,
            ...mpData // Return all payment processor data for PIX processing
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
            ...mpData // Return all payment processor data
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
