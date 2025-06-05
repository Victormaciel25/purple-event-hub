
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
    console.log('Request data received:', requestData);
    
    // Handle autocomplete requests
    if (requestData.type === 'autocomplete' && requestData.input) {
      const input = requestData.input;
      console.log(`Buscando sugestões para: ${input}`);
      
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&language=pt_BR&components=country:br&key=${googleMapsApiKey}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      console.log(`Status da busca de sugestões: ${data.status}`);
      if (data.status !== 'OK') {
        console.error('Erro na busca de sugestões:', data);
      }
      
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
      if (data.status !== 'OK') {
        console.error('Erro na busca de detalhes:', data);
      }
      
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

      // Para CEPs brasileiros, vamos tentar uma abordagem diferente
      const isValidCep = /^\d{8}$/.test(address.replace(/\D/g, ''));
      let geocodeUrl;
      
      if (isValidCep) {
        // Para CEPs, usar endereço formatado
        const formattedCep = address.replace(/(\d{5})(\d{3})/, '$1-$2');
        geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedCep + ', Brasil')}&region=br&key=${googleMapsApiKey}`;
        console.log(`Geocodificando CEP formatado: ${formattedCep}, Brasil`);
      } else {
        geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&key=${googleMapsApiKey}`;
      }
      
      console.log('URL da requisição:', geocodeUrl.replace(googleMapsApiKey, '[API_KEY_HIDDEN]'));
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      console.log(`Status da geocodificação: ${data.status}`);
      console.log('Response completa:', JSON.stringify(data, null, 2));

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
        
        // Tentar uma abordagem alternativa se o primeiro método falhar
        if (data.status === 'REQUEST_DENIED' && isValidCep) {
          console.log('Tentando abordagem alternativa para CEP...');
          
          // Para CEPs, podemos tentar usar um serviço brasileiro como fallback
          try {
            const cepClean = address.replace(/\D/g, '');
            const viacepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
            const viacepData = await viacepResponse.json();
            
            if (viacepData && !viacepData.erro) {
              // Usar o endereço completo do ViaCEP para geocodificar
              const fullAddress = `${viacepData.logradouro}, ${viacepData.bairro}, ${viacepData.localidade}, ${viacepData.uf}, Brasil`;
              console.log('Tentando geocodificar endereço do ViaCEP:', fullAddress);
              
              const fallbackUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&region=br&key=${googleMapsApiKey}`;
              const fallbackResponse = await fetch(fallbackUrl);
              const fallbackData = await fallbackResponse.json();
              
              if (fallbackData.status === "OK" && fallbackData.results && fallbackData.results.length > 0) {
                const result = fallbackData.results[0];
                const location = result.geometry.location;
                
                const geocodingResult = {
                  lat: location.lat,
                  lng: location.lng,
                  locationName: result.formatted_address
                };
                
                console.log(`Geocodificação alternativa bem-sucedida:`, geocodingResult);
                
                return new Response(
                  JSON.stringify(geocodingResult),
                  { 
                    headers: { 
                      'Content-Type': 'application/json',
                      ...corsHeaders 
                    } 
                  }
                );
              }
            }
          } catch (fallbackError) {
            console.error('Erro na abordagem alternativa:', fallbackError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Localização não encontrada', 
            status: data.status,
            details: data.error_message || 'Verifique se o CEP está correto'
          }),
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
        details: 'Erro interno do servidor. Verifique os logs para mais detalhes.'
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
