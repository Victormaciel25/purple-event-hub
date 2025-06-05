
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
// Usar a mesma API key que está configurada no projeto
const googleMapsApiKey = "AIzaSyA5P5mbDieTYIeczsRTS1TSxR005fDnScc";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se a API key está disponível
    if (!googleMapsApiKey) {
      console.error('Google Maps API Key não encontrada');
      throw new Error('Google Maps API Key não está configurada no ambiente do servidor');
    }

    const requestData = await req.json();
    
    // Handle autocomplete requests
    if (requestData.type === 'autocomplete' && requestData.input) {
      const input = requestData.input;
      console.log(`Buscando sugestões para: ${input}`);
      
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&language=pt_BR&components=country:br&key=${googleMapsApiKey}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      console.log(`Status da busca de sugestões: ${data.status}`);
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Handle place details requests
    else if (requestData.type === 'placeDetails' && requestData.placeId) {
      const placeId = requestData.placeId;
      console.log(`Buscando detalhes para o lugar ID: ${placeId}`);
      
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,name&key=${googleMapsApiKey}`;
      
      const response = await fetch(detailsUrl);
      const data = await response.json();
      
      console.log(`Status da busca de detalhes: ${data.status}`);
      
      return new Response(
        JSON.stringify(data),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Handle geocoding requests (original functionality)
    else if (requestData.address) {
      const address = requestData.address;
      
      if (!address) {
        throw new Error('Endereço não fornecido');
      }

      console.log(`Geocodificando endereço: ${address}`);

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
        
        console.log(`Geocodificação bem-sucedida:`, geocodingResult);
        
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
        console.error(`Erro na geocodificação: ${data.status}`, data);
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
    } else {
      throw new Error('Requisição inválida. Tipo não especificado ou dados incompletos.');
    }
  } catch (error) {
    console.error("Erro na função geocode-address:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Verifique se a chave da API do Google Maps está configurada corretamente'
      }),
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
