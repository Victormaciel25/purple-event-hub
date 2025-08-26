import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmBookingRequest {
  hold_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
  total_amount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization: authHeader } } }
    );

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { 
      hold_id, 
      customer_name, 
      customer_email, 
      customer_phone, 
      notes, 
      total_amount 
    }: ConfirmBookingRequest = await req.json();

    if (!hold_id || !customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: hold_id, customer_name, customer_email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`📝 Confirmando booking para hold ${hold_id} por usuário ${user.id}`);

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verificar se o hold existe, está ativo e pertence ao usuário
    const { data: hold, error: holdError } = await supabaseService
      .from('holds')
      .select('*')
      .eq('id', hold_id)
      .eq('created_by', user.id)
      .eq('status', 'active')
      .single();

    if (holdError || !hold) {
      return new Response(
        JSON.stringify({ error: 'Hold não encontrado ou expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Verificar se o hold não expirou
    const now = new Date();
    const expiresAt = new Date(hold.expires_at);
    if (now > expiresAt) {
      // Marcar como expirado
      await supabaseService
        .from('holds')
        .update({ status: 'expired' })
        .eq('id', hold_id);

      return new Response(
        JSON.stringify({ error: 'Hold expirado. Selecione um novo horário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
      );
    }

    // 3. Verificar novamente se não há conflitos (double-check de segurança)
    const { data: resource } = await supabaseService
      .from('resources')
      .select('buffer_before_minutes, buffer_after_minutes')
      .eq('id', hold.resource_id)
      .single();

    if (resource) {
      const startTime = new Date(hold.start_t);
      const endTime = new Date(hold.end_t);
      const bufferStart = new Date(startTime.getTime() - resource.buffer_before_minutes * 60 * 1000);
      const bufferEnd = new Date(endTime.getTime() + resource.buffer_after_minutes * 60 * 1000);

      // Verificar conflitos com outros bookings
      const { data: conflicts } = await supabaseService
        .from('bookings')
        .select('id')
        .eq('resource_id', hold.resource_id)
        .in('status', ['pending', 'confirmed'])
        .lt('start_t', bufferEnd.toISOString())
        .gt('end_t', bufferStart.toISOString())
        .limit(1);

      if (conflicts && conflicts.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Conflito detectado. Horário não está mais disponível.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
    }

    // 4. Criar booking e marcar hold como confirmado em transação
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .insert({
        resource_id: hold.resource_id,
        start_t: hold.start_t,
        end_t: hold.end_t,
        created_by: user.id,
        status: 'pending',
        customer_name,
        customer_email,
        customer_phone,
        notes,
        total_amount,
        payment_status: total_amount ? 'pending' : 'paid'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('❌ Erro ao criar booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Erro interno ao confirmar reserva' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 5. Marcar hold como confirmado
    const { error: updateHoldError } = await supabaseService
      .from('holds')
      .update({ status: 'confirmed' })
      .eq('id', hold_id);

    if (updateHoldError) {
      console.error('⚠️ Erro ao marcar hold como confirmado:', updateHoldError);
      // Não é crítico, booking já foi criado
    }

    // 6. Buscar dados do resource para resposta
    const { data: resourceData } = await supabaseService
      .from('resources')
      .select('name, type')
      .eq('id', hold.resource_id)
      .single();

    console.log(`✅ Booking confirmado: ${booking.id}`);

    return new Response(
      JSON.stringify({
        booking_id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status,
        resource_name: resourceData?.name,
        resource_type: resourceData?.type,
        start_t: booking.start_t,
        end_t: booking.end_t,
        customer_name: booking.customer_name,
        total_amount: booking.total_amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao confirmar booking:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});