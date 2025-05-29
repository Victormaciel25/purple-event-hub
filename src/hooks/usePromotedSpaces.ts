
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

      // Buscar espaços com promoções ativas usando LEFT JOIN para garantir visibilidade pública
      const { data: promotedSpaces, error: promotedError } = await supabase
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
          space_photos(storage_path),
          space_promotions(
            expires_at,
            plan_id,
            active
          )
        `)
        .eq('status', 'approved')
        .not('space_promotions', 'is', null)
        .eq('space_promotions.active', true)
        .gt('space_promotions.expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (promotedError) {
        console.error('Error fetching promoted spaces:', promotedError);
      }

      console.log('Promoted spaces found:', promotedSpaces?.length || 0);

      // Buscar espaços normais (sem promoção ativa)
      const promotedSpaceIds = (promotedSpaces || []).map(s => s.id);
      
      let normalSpacesQuery = supabase
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

      // Se houver espaços promovidos, excluí-los da lista normal
      if (promotedSpaceIds.length > 0) {
        normalSpacesQuery = normalSpacesQuery.not('id', 'in', `(${promotedSpaceIds.join(',')})`);
      }

      const { data: normalSpaces, error: normalError } = await normalSpacesQuery;

      if (normalError) {
        console.error('Error fetching normal spaces:', normalError);
      }

      console.log('Normal spaces found:', normalSpaces?.length || 0);

      // Processar espaços promovidos
      const processedPromotedSpaces = await Promise.all((promotedSpaces || []).map(async (space) => {
        let photoUrl = APP_CONSTANTS.DEFAULT_SPACE_IMAGE;
        
        if (space.space_photos && space.space_photos.length > 0) {
          const { data: urlData } = await supabase.storage
            .from(STORAGE.SPACES_BUCKET)
            .createSignedUrl(space.space_photos[0].storage_path, 3600);
            
          if (urlData) {
            photoUrl = urlData.signedUrl;
          }
        }
        
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
          isPromoted: true,
          promotionExpiresAt: space.space_promotions?.[0]?.expires_at
        };
      }));

      // Processar espaços normais
      const processedNormalSpaces = await Promise.all((normalSpaces || []).map(async (space) => {
        let photoUrl = APP_CONSTANTS.DEFAULT_SPACE_IMAGE;
        
        if (space.space_photos && space.space_photos.length > 0) {
          const { data: urlData } = await supabase.storage
            .from(STORAGE.SPACES_BUCKET)
            .createSignedUrl(space.space_photos[0].storage_path, 3600);
            
          if (urlData) {
            photoUrl = urlData.signedUrl;
          }
        }
        
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
          isPromoted: false
        };
      }));

      // Combinar: promovidos primeiro, depois normais
      const allSpaces = [...processedPromotedSpaces, ...processedNormalSpaces];
      console.log('Total spaces processed:', allSpaces.length);
      console.log('Promoted spaces:', processedPromotedSpaces.length);
      setSpaces(allSpaces);

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
