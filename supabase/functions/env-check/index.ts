import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function mask(value: string | null) {
  if (!value) return null;
  const start = value.slice(0, 4);
  const end = value.slice(-4);
  return `${start}...${end}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || null;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || null;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || null;
    const openAI = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY") || null;

    const payload = {
      ok: true,
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
        hasAnonKey: !!anonKey,
        hasOpenAIKey: !!openAI,
        effectiveSupabaseUrl: supabaseUrl,
        serviceRoleKeyMasked: mask(serviceRoleKey),
        anonKeyMasked: mask(anonKey),
        openAIKeyMasked: mask(openAI),
      },
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("env-check error:", error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
