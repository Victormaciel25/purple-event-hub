
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`📥 Recebida requisição: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a requisição OPTIONS (CORS)');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Buscando GOOGLE_MAPS_API_KEY nas variáveis de ambiente...');
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY não encontrada nas variáveis de ambiente');
      console.log('📝 Variáveis disponíveis:', Object.keys(Deno.env.toObject()));
      throw new Error('Chave da API do Google Maps não foi configurada');
    }

    console.log('✅ Chave da API do Google Maps encontrada com sucesso');
    console.log(`🔑 Tamanho da chave: ${googleMapsApiKey.length} caracteres`);

    const response = {
      success: true,
      apiKey: googleMapsApiKey
    };

    console.log('📤 Enviando resposta de sucesso');

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Erro na edge function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Falha ao obter chave da API'
    };

    console.log('📤 Enviando resposta de erro:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    );
  }
});
