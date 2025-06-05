
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('Request data received:', requestData);
    
    // Handle autocomplete requests
    if (requestData.type === 'autocomplete' && requestData.input) {
      const input = requestData.input;
      console.log(`Buscando sugestões para: ${input}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Autocomplete temporariamente indisponível. Use o campo de CEP para centralizar o mapa.'
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Handle geocoding requests (CEP brasileiro)
    else if (requestData.address) {
      const address = requestData.address;
      
      if (!address) {
        throw new Error('Endereço não fornecido');
      }

      console.log(`Processando endereço: ${address}`);

      // Limpar e validar CEP
      const cepClean = address.replace(/\D/g, '');
      const isValidCep = /^\d{8}$/.test(cepClean);
      
      if (!isValidCep) {
        console.log(`CEP inválido: ${cepClean}`);
        return new Response(
          JSON.stringify({ 
            error: 'CEP inválido', 
            details: 'Por favor, insira um CEP válido com 8 dígitos (formato: 00000-000)'
          }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }

      console.log(`Processando CEP válido: ${cepClean}`);
      
      try {
        console.log(`Consultando ViaCEP para o CEP: ${cepClean}`);
        
        const viacepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        
        if (!viacepResponse.ok) {
          console.error(`Erro na resposta do ViaCEP: ${viacepResponse.status} ${viacepResponse.statusText}`);
          throw new Error('Erro na consulta ao ViaCEP');
        }
        
        const viacepData = await viacepResponse.json();
        console.log('Resposta ViaCEP:', viacepData);
        
        if (viacepData && !viacepData.erro) {
          // Coordenadas aproximadas das principais cidades brasileiras
          const cityCoordinates = {
            'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
            'São Paulo': { lat: -23.5505, lng: -46.6333 },
            'Belo Horizonte': { lat: -19.9191, lng: -43.9386 },
            'Brasília': { lat: -15.7942, lng: -47.8822 },
            'Salvador': { lat: -12.9714, lng: -38.5014 },
            'Fortaleza': { lat: -3.7319, lng: -38.5267 },
            'Recife': { lat: -8.0476, lng: -34.8770 },
            'Curitiba': { lat: -25.4244, lng: -49.2654 },
            'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
            'Manaus': { lat: -3.1190, lng: -60.0217 },
            'Belém': { lat: -1.4558, lng: -48.5044 },
            'Goiânia': { lat: -16.6799, lng: -49.2550 },
            'Campinas': { lat: -22.9099, lng: -47.0626 },
            'Nova Iguaçu': { lat: -22.7593, lng: -43.4503 },
            'São Luís': { lat: -2.5297, lng: -44.3028 },
            'Duque de Caxias': { lat: -22.7856, lng: -43.3117 },
            'Teresina': { lat: -5.0892, lng: -42.8019 },
            'Natal': { lat: -5.7945, lng: -35.2110 },
            'Campo Grande': { lat: -20.4697, lng: -54.6201 },
            'João Pessoa': { lat: -7.1195, lng: -34.8450 },
            'São Bernardo do Campo': { lat: -23.6914, lng: -46.5646 },
            'Santo André': { lat: -23.6633, lng: -46.5307 },
            'Osasco': { lat: -23.5329, lng: -46.7918 },
            'Jaboatão dos Guararapes': { lat: -8.1120, lng: -35.0150 },
            'São José dos Campos': { lat: -23.2237, lng: -45.9009 },
            'Ribeirão Preto': { lat: -21.1775, lng: -47.8208 },
            'Uberlândia': { lat: -18.9113, lng: -48.2622 },
            'Sorocaba': { lat: -23.5015, lng: -47.4526 },
            'Contagem': { lat: -19.9317, lng: -44.0536 },
            'Aracaju': { lat: -10.9472, lng: -37.0731 }
          };
          
          const cityName = viacepData.localidade;
          let coordinates = cityCoordinates[cityName];
          
          // Se não encontrar a cidade específica, usar coordenadas por estado
          if (!coordinates) {
            const stateCoordinates = {
              'AC': { lat: -8.77, lng: -70.55 },
              'AL': { lat: -9.71, lng: -35.73 },
              'AP': { lat: 1.41, lng: -51.77 },
              'AM': { lat: -3.07, lng: -61.66 },
              'BA': { lat: -12.96, lng: -38.51 },
              'CE': { lat: -3.71, lng: -38.54 },
              'DF': { lat: -15.83, lng: -47.86 },
              'ES': { lat: -19.19, lng: -40.34 },
              'GO': { lat: -16.64, lng: -49.31 },
              'MA': { lat: -2.55, lng: -44.30 },
              'MT': { lat: -12.64, lng: -55.42 },
              'MS': { lat: -20.51, lng: -54.54 },
              'MG': { lat: -18.10, lng: -44.38 },
              'PA': { lat: -5.53, lng: -52.29 },
              'PB': { lat: -7.06, lng: -35.55 },
              'PR': { lat: -24.89, lng: -51.55 },
              'PE': { lat: -8.28, lng: -35.07 },
              'PI': { lat: -8.28, lng: -45.24 },
              'RJ': { lat: -22.84, lng: -43.15 },
              'RN': { lat: -5.22, lng: -36.52 },
              'RS': { lat: -30.01, lng: -51.22 },
              'RO': { lat: -11.22, lng: -62.80 },
              'RR': { lat: 1.89, lng: -61.22 },
              'SC': { lat: -27.33, lng: -49.44 },
              'SP': { lat: -23.55, lng: -46.64 },
              'SE': { lat: -10.90, lng: -37.07 },
              'TO': { lat: -10.25, lng: -48.25 }
            };
            
            coordinates = stateCoordinates[viacepData.uf] || { lat: -23.5505, lng: -46.6333 }; // Default para SP
          }
          
          const geocodingResult = {
            lat: coordinates.lat,
            lng: coordinates.lng,
            locationName: `${viacepData.logradouro ? viacepData.logradouro + ', ' : ''}${viacepData.bairro ? viacepData.bairro + ', ' : ''}${viacepData.localidade}, ${viacepData.uf}, Brasil`
          };
          
          console.log(`CEP ${cepClean} processado com sucesso:`, geocodingResult);
          
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
          console.error('CEP não encontrado no ViaCEP:', viacepData);
          return new Response(
            JSON.stringify({ 
              error: 'CEP não encontrado', 
              details: 'Verifique se o CEP está correto e tente novamente'
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
      } catch (viacepError) {
        console.error('Erro ao consultar ViaCEP:', viacepError);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao buscar CEP', 
            details: 'Serviço de consulta de CEP temporariamente indisponível. Tente novamente em alguns instantes.'
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
    } else {
      throw new Error('Requisição inválida. Tipo não especificado ou dados incompletos.');
    }
  } catch (error) {
    console.error("Erro na função geocode-address:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro interno do servidor. Verifique os dados e tente novamente.'
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
