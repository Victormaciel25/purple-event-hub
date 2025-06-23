
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useGoogleMapsKey = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoogleMapsKey = async () => {
      try {
        console.log('🗝️ Buscando chave do Google Maps API...');
        
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error) {
          console.error('❌ Erro ao buscar chave do Google Maps:', error);
          setError('Erro ao carregar a chave do Google Maps');
          return;
        }

        if (data?.apiKey) {
          console.log('✅ Chave do Google Maps obtida com sucesso');
          setApiKey(data.apiKey);
        } else {
          console.error('❌ Chave do Google Maps não encontrada na resposta');
          setError('Chave do Google Maps não encontrada');
        }
      } catch (err) {
        console.error('❌ Erro na requisição:', err);
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchGoogleMapsKey();
  }, []);

  return { apiKey, loading, error };
};
