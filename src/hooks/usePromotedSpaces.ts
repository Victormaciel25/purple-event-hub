
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_CONSTANTS, STORAGE } from '@/config/app-config';

type PromotedSpace = {
  id: string;
  name: string;
  address: string;
  price: string;
  number: string;
  state: string;
  photo_url?: string;
  description: string;
  categories?: string[];
  isPromoted: boolean;
  promotionExpiresAt?: string;
};

export const usePromotedSpaces = () => {
  const [spaces, setSpaces] = useState<PromotedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpacesWithPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching spaces with promotions...');

      // Primeiro, buscar todos os espaços aprovados
      const { data: allSpaces, error: spacesError } = await supabase
        .from('spaces')
        .select(`
          id,
          name,
          address,
          number,
          state,
          price,
          description,
          categories,
          space_photos(storage_path)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (spacesError) {
        console.error('Error fetching spaces:', spacesError);
        throw spacesError;
      }

      console.log('All spaces found:', allSpaces?.length || 0);

      // Buscar promoções ativas
      const { data: activePromotions, error: promotionsError } = await supabase
        .from('space_promotions')
        .select('space_id, expires_at, plan_id')
        .eq('active', true)
        .gt('expires_at', new Date().toISOString());

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
        // Não falhar se não conseguir buscar promoções, apenas mostrar sem destaque
      }

      console.log('Active promotions found:', activePromotions?.length || 0);

      // Criar um map de promoções por space_id
      const promotionsMap = new Map();
      (activePromotions || []).forEach(promo => {
        promotionsMap.set(promo.space_id, promo);
      });

      // Processar todos os espaços
      const processedSpaces = await Promise.all((allSpaces || []).map(async (space) => {
        let photoUrl = APP_CONSTANTS.DEFAULT_SPACE_IMAGE;
        
        if (space.space_photos && space.space_photos.length > 0) {
          const { data: urlData } = await supabase.storage
            .from(STORAGE.SPACES_BUCKET)
            .createSignedUrl(space.space_photos[0].storage_path, 3600);
            
          if (urlData) {
            photoUrl = urlData.signedUrl;
          }
        }

        const promotion = promotionsMap.get(space.id);
        const isPromoted = !!promotion;
        
        return {
          id: space.id,
          name: space.name,
          address: space.address,
          number: space.number,
          state: space.state,
          price: space.price,
          description: space.description,
          categories: space.categories || [],
          photo_url: photoUrl,
          isPromoted,
          promotionExpiresAt: promotion?.expires_at
        };
      }));

      // A ordenação agora será feita no componente Explore para respeitar o filtro de categoria
      setSpaces(processedSpaces);
      
      console.log('Total spaces processed:', processedSpaces.length);
      console.log('Promoted spaces:', processedSpaces.filter(s => s.isPromoted).length);
      console.log('Normal spaces:', processedSpaces.filter(s => !s.isPromoted).length);

    } catch (error) {
      console.error('Error fetching spaces:', error);
      setError('Erro ao carregar espaços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpacesWithPromotion();
  }, []);

  return {
    spaces,
    loading,
    error,
    refetch: fetchSpacesWithPromotion
  };
};
