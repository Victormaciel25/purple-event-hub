
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
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('ACCESS_TOKEN') || '';

// Create subscription handler
async function createSubscription(req: Request) {
  try {
    const requestData = await req.json();
    const { 
      reason,
      amount,
      currency,
      frequency,
      frequency_type,
      repetitions,
      billing_day_proportional,
      back_url,
      external_reference,
      payer_email,
      card_token_id,
      subscription_start,
      space_id,
      plan_id,
      user_id,
      payer,
      device_id
    } = requestData;

    console.log("Creating subscription with data:", requestData);

    // Validate required fields
    if (!card_token_id || !payer_email || !space_id || !plan_id || !user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required subscription information" 
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

    // Calculate billing day from subscription start date
    const startDate = new Date(subscription_start);
    const billing_day = startDate.getDate();
    
    console.log("Using billing day from subscription start:", billing_day);

    // 1) Create the PLAN
    const planBody = {
      reason,
      auto_recurring: {
        frequency,
        frequency_type,
        repetitions,
        billing_day,
        billing_day_proportional,
        transaction_amount: amount,
        currency_id: currency,
      },
      back_url,
    };

    console.log("Creating preapproval plan with body:", JSON.stringify(planBody));

    let planResponse;
    let planData;

    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode for subscription plan");
      // Simulate successful plan creation for testing
      planData = {
        id: `test-plan-${Date.now()}`,
        status: "active",
        reason,
        auto_recurring: planBody.auto_recurring,
        date_created: new Date().toISOString()
      };
      planResponse = {
        ok: true,
        status: 200
      } as Response;
    } else {
      // Real API call
      planResponse = await fetch("https://api.mercadopago.com/preapproval_plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(planBody)
      });
      
      planData = await planResponse.json();
    }

    console.log("Plan creation response:", JSON.stringify(planData));

    if (!planResponse.ok) {
      console.error("Error creating plan:", planData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create subscription plan",
          details: planData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const preapproval_plan_id = planData.id;

    // 2) Create the SUBSCRIPTION (removed end_date from auto_recurring)
    const subscriptionBody = {
      preapproval_plan_id,
      reason,
      external_reference,
      payer_email,
      card_token_id,
      auto_recurring: {
        frequency,
        frequency_type,
        start_date: subscription_start,
        transaction_amount: amount,
        currency_id: currency,
      },
      back_url,
      status: "authorized",
    };

    console.log("Creating subscription with body:", JSON.stringify(subscriptionBody));

    let subscriptionResponse;
    let subscriptionData;

    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      console.log("Using test mode for subscription");
      // Simulate successful subscription creation for testing
      subscriptionData = {
        id: `test-subscription-${Date.now()}`,
        status: "authorized",
        preapproval_plan_id,
        payer_email,
        external_reference,
        date_created: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        auto_recurring: subscriptionBody.auto_recurring
      };
      subscriptionResponse = {
        ok: true,
        status: 200
      } as Response;
    } else {
      // Real API call
      subscriptionResponse = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(subscriptionBody)
      });
      
      subscriptionData = await subscriptionResponse.json();
    }

    console.log("Subscription creation response:", JSON.stringify(subscriptionData));

    if (!subscriptionResponse.ok) {
      console.error("Error creating subscription:", subscriptionData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create subscription",
          details: subscriptionData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    try {
      // Store subscription in database
      console.log("Storing subscription in database...");
      
      const { data: insertData, error: dbError } = await supabase
        .from('space_subscriptions')
        .insert({
          preapproval_plan_id,
          subscription_id: subscriptionData.id,
          status: subscriptionData.status,
          user_id,
          space_id,
          plan_id,
          payer_email,
          amount,
          started_at: subscriptionData.date_created,
          next_billing_date: subscriptionData.next_billing_date,
        })
        .select();

      console.log("Database insert result:", insertData, dbError);

      if (dbError) {
        console.error("Error storing subscription:", dbError);
        
        // Return the subscription data even if record keeping failed
        return new Response(
          JSON.stringify({ 
            success: true, 
            plan: planData,
            subscription: subscriptionData,
            warning: "Subscription created but record keeping failed: " + dbError.message
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      console.log("Subscription created and stored successfully");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          plan: planData,
          subscription: subscriptionData
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (dbProcessingError) {
      console.error("Error in database processing:", dbProcessingError);
      
      // Subscription was successful but database processing failed
      return new Response(
        JSON.stringify({ 
          success: true, 
          plan: planData,
          subscription: subscriptionData,
          warning: "Subscription created but record keeping failed: " + (dbProcessingError instanceof Error ? dbProcessingError.message : String(dbProcessingError))
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error creating subscription:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error creating subscription",
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

  // Create the subscription
  return createSubscription(req);
});
