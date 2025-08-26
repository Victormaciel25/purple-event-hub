import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilityRequest {
  resource_id: string;
  from: string; // ISO date string
  to: string;   // ISO date string
  duration_minutes?: number;
}

interface TimeSlot {
  start_t: string;
  end_t: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { resource_id, from, to, duration_minutes }: AvailabilityRequest = await req.json();

    if (!resource_id || !from || !to) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: resource_id, from, to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Buscando disponibilidade para resource ${resource_id} de ${from} até ${to}`);

    // 1. Buscar resource e suas configurações
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

    const slotDuration = duration_minutes || resource.duration_minutes;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timezone = resource.tz;

    console.log(`📋 Resource config: slot_granularity=${resource.slot_granularity_minutes}min, duration=${slotDuration}min, tz=${timezone}`);

    // 2. Buscar horários de funcionamento
    const { data: workingHours, error: whError } = await supabase
      .from('resource_working_hours')
      .select('*')
      .eq('resource_id', resource_id);

    if (whError) {
      throw new Error(`Erro ao buscar horários de funcionamento: ${whError.message}`);
    }

    // 3. Buscar exceções no período
    const { data: exceptions, error: excError } = await supabase
      .from('resource_exceptions')
      .select('*')
      .eq('resource_id', resource_id)
      .lte('date_from', to)
      .gte('date_to', from);

    if (excError) {
      throw new Error(`Erro ao buscar exceções: ${excError.message}`);
    }

    // 4. Buscar eventos ocupados (bookings + holds + external_events)
    const now = new Date();
    const minNoticeDate = new Date(now.getTime() + resource.min_notice_hours * 60 * 60 * 1000);

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_t, end_t')
      .eq('resource_id', resource_id)
      .in('status', ['pending', 'confirmed'])
      .gte('end_t', from)
      .lte('start_t', to);

    if (bookingsError) {
      throw new Error(`Erro ao buscar reservas: ${bookingsError.message}`);
    }

    const { data: holds, error: holdsError } = await supabase
      .from('holds')
      .select('start_t, end_t')
      .eq('resource_id', resource_id)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .gte('end_t', from)
      .lte('start_t', to);

    if (holdsError) {
      throw new Error(`Erro ao buscar holds: ${holdsError.message}`);
    }

    const { data: externalEvents, error: extError } = await supabase
      .from('external_events')
      .select('start_t, end_t')
      .eq('resource_id', resource_id)
      .gte('end_t', from)
      .lte('start_t', to);

    if (extError) {
      throw new Error(`Erro ao buscar eventos externos: ${extError.message}`);
    }

    // 5. Combinar todos os eventos ocupados
    const occupiedEvents = [
      ...(bookings || []),
      ...(holds || []),
      ...(externalEvents || [])
    ].map(event => ({
      start: new Date(event.start_t),
      end: new Date(event.end_t)
    }));

    console.log(`🚫 ${occupiedEvents.length} eventos ocupados encontrados`);

    // 6. Gerar slots disponíveis
    const availableSlots: TimeSlot[] = [];
    const totalBufferMinutes = resource.buffer_before_minutes + resource.buffer_after_minutes;
    const totalSlotDuration = slotDuration + totalBufferMinutes;

    // Iterar dia por dia
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const weekday = currentDate.getDay(); // 0 = domingo
      
      // Verificar se há horário de funcionamento para este dia
      const dayWorkingHours = workingHours?.filter(wh => wh.weekday === weekday) || [];
      
      if (dayWorkingHours.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Verificar exceções para este dia
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayExceptions = exceptions?.filter(exc => 
        exc.date_from <= dateStr && exc.date_to >= dateStr
      ) || [];

      // Se há exceção "closed", pular este dia
      const closedException = dayExceptions.find(exc => exc.kind === 'closed');
      if (closedException) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Usar exceções "open" se existirem, senão usar horário normal
      const openException = dayExceptions.find(exc => exc.kind === 'open');
      const timeRanges = openException 
        ? [{ start_time: openException.start_time!, end_time: openException.end_time! }]
        : dayWorkingHours;

      // Gerar slots para cada faixa de horário
      for (const timeRange of timeRanges) {
        const [startHour, startMin] = timeRange.start_time.split(':').map(Number);
        const [endHour, endMin] = timeRange.end_time.split(':').map(Number);

        const startTime = new Date(currentDate);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(currentDate);
        endTime.setHours(endHour, endMin, 0, 0);

        // Gerar slots a cada slot_granularity_minutes
        let slotStart = new Date(startTime);
        while (slotStart.getTime() + totalSlotDuration * 60 * 1000 <= endTime.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
          const bufferEnd = new Date(slotEnd.getTime() + resource.buffer_after_minutes * 60 * 1000);

          // Aplicar buffer antes
          const bufferStart = new Date(slotStart.getTime() - resource.buffer_before_minutes * 60 * 1000);

          // Verificar janela de antecedência
          if (slotStart < minNoticeDate) {
            slotStart = new Date(slotStart.getTime() + resource.slot_granularity_minutes * 60 * 1000);
            continue;
          }

          // Verificar se não há sobreposição com eventos ocupados
          const hasOverlap = occupiedEvents.some(event => 
            overlaps(bufferStart, bufferEnd, event.start, event.end)
          );

          if (!hasOverlap) {
            availableSlots.push({
              start_t: slotStart.toISOString(),
              end_t: slotEnd.toISOString()
            });
          }

          slotStart = new Date(slotStart.getTime() + resource.slot_granularity_minutes * 60 * 1000);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ ${availableSlots.length} slots disponíveis gerados`);

    return new Response(
      JSON.stringify({ 
        slots: availableSlots.slice(0, 100), // Limitar a 100 slots para performance
        resource_info: {
          name: resource.name,
          type: resource.type,
          duration_minutes: slotDuration,
          slot_granularity_minutes: resource.slot_granularity_minutes,
          timezone: resource.tz
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}