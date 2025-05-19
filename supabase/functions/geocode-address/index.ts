
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se a API key está disponível
    if (!googleMapsApiKey) {
      throw new Error('Google Maps API Key não está configurada');
    }

    // Extrair endereço do corpo da requisição
    const { address } = await req.json();
    
    if (!address) {
      throw new Error('Endereço não fornecido');
    }

    console.log(`Geocodificando endereço: ${address}`);

    // Fazer requisição para API do Google Maps
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    console.log(`Status da geocodificação: ${data.status}`);

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      const geocodingResult = {
        lat: location.lat,
        lng: location.lng,
        locationName: result.formatted_address
      };
      
      return new Response(
        JSON.stringify(geocodingResult),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Localização não encontrada', status: data.status }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
  } catch (error) {
    console.error("Erro na função geocode-address:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});
