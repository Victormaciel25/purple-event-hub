
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('ACCESS_TOKEN') || 'TEST-72418442407574-032019-06b36295f414c18196c22b750c1afb56-334101838';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, entity_type } = await req.json();
    
    if (!payment_id || !entity_type) {
      return new Response(
        JSON.stringify({ error: 'Missing payment_id or entity_type' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking payment status for payment_id: ${payment_id}, entity_type: ${entity_type}`);

    // Check payment status with Mercado Pago
    let paymentData;
    
    if (MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-')) {
      // For test mode, simulate approved payment after some time
      paymentData = {
        id: payment_id,
        status: 'approved',
        status_detail: 'accredited'
      };
    } else {
      // Real API call to Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });
      
      if (!mpResponse.ok) {
        throw new Error('Failed to fetch payment status from Mercado Pago');
      }
      
      paymentData = await mpResponse.json();
    }

    console.log(`Payment status from MP: ${paymentData.status}`);

    // Only update if payment is approved
    if (paymentData.status === 'approved') {
      const tableName = entity_type === 'vendor' ? 'vendor_promotions' : 'space_promotions';
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ payment_status: 'approved' })
        .eq('payment_id', payment_id);

      if (updateError) {
        console.error('Error updating payment status:', updateError);
        throw updateError;
      }

      console.log(`Updated ${tableName} payment status to approved for payment_id: ${payment_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_status: paymentData.status,
        status_detail: paymentData.status_detail 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
