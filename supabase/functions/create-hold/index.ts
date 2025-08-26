import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateHoldRequest {
  resource_id: string;
  start_t: string;
  end_t: string;
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

    const { resource_id, start_t, end_t }: CreateHoldRequest = await req.json();

    if (!resource_id || !start_t || !end_t) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: resource_id, start_t, end_t' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const startTime = new Date(start_t);
    const endTime = new Date(end_t);

    console.log(`🔒 Criando hold para resource ${resource_id} de ${start_t} até ${end_t} para usuário ${user.id}`);

    // 1. Verificar se o recurso existe e está ativo
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resource_id)
      .eq('is_active', true)
      .single();

    if (resourceError || !resource) {
      return new Response(
        JSON.stringify({ error: 'Recurso não encontrado ou inativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Verificar janela de antecedência mínima
    const now = new Date();
    const minNoticeDate = new Date(now.getTime() + resource.min_notice_hours * 60 * 60 * 1000);
    if (startTime < minNoticeDate) {
      return new Response(
        JSON.stringify({ 
          error: `Antecedência mínima de ${resource.min_notice_hours} horas necessária` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Usar service role para verificar disponibilidade e criar hold atomicamente
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Verificar se há conflitos (com buffers)
    const bufferStart = new Date(startTime.getTime() - resource.buffer_before_minutes * 60 * 1000);
    const bufferEnd = new Date(endTime.getTime() + resource.buffer_after_minutes * 60 * 1000);

    // Verificar bookings conflitantes
    const { data: conflictingBookings } = await supabaseService
      .from('bookings')
      .select('id')
      .eq('resource_id', resource_id)
      .in('status', ['pending', 'confirmed'])
      .lt('start_t', bufferEnd.toISOString())
      .gt('end_t', bufferStart.toISOString())
      .limit(1);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Horário não disponível - conflito com reserva existente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Verificar holds ativos conflitantes
    const { data: conflictingHolds } = await supabaseService
      .from('holds')
      .select('id')
      .eq('resource_id', resource_id)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .lt('start_t', bufferEnd.toISOString())
      .gt('end_t', bufferStart.toISOString())
      .limit(1);

    if (conflictingHolds && conflictingHolds.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Horário não disponível - conflito com hold ativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Verificar eventos externos conflitantes
    const { data: conflictingExternal } = await supabaseService
      .from('external_events')
      .select('id')
      .eq('resource_id', resource_id)
      .lt('start_t', bufferEnd.toISOString())
      .gt('end_t', bufferStart.toISOString())
      .limit(1);

    if (conflictingExternal && conflictingExternal.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Horário não disponível - conflito com evento externo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // 5. Criar hold (expira em 15 minutos)
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const { data: hold, error: holdError } = await supabaseService
      .from('holds')
      .insert({
        resource_id,
        start_t: startTime.toISOString(),
        end_t: endTime.toISOString(),
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (holdError) {
      console.error('❌ Erro ao criar hold:', holdError);
      return new Response(
        JSON.stringify({ error: 'Erro interno ao criar reserva temporária' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`✅ Hold criado: ${hold.id}, expira em ${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({
        hold_id: hold.id,
        expires_at: expiresAt.toISOString(),
        resource_name: resource.name,
        start_t: startTime.toISOString(),
        end_t: endTime.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao criar hold:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});