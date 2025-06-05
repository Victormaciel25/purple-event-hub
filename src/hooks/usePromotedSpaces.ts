
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
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

// Função para calcular distância entre dois pontos em km usando fórmula de Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const usePromotedSpaces = () => {
  const [spaces, setSpaces] = useState<PromotedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const getUserLocation = async (): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('Geolocalização não suportada pelo navegador');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('Localização do usuário obtida:', location);
          resolve(location);
        },
        (error) => {
          console.log('Erro ao obter localização:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos
        }
      );
    });
  };

  const fetchSpacesWithPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching spaces with promotions...');

      // Obter localização do usuário
      const location = await getUserLocation();
      setUserLocation(location);

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
          latitude,
          longitude,
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
        
        // Calcular distância se temos localização do usuário e do espaço
        let distanceKm: number | undefined;
        if (location && space.latitude && space.longitude) {
          distanceKm = calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(space.latitude.toString()),
            parseFloat(space.longitude.toString())
          );
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
          isPromoted,
          promotionExpiresAt: promotion?.expires_at,
          latitude: space.latitude ? parseFloat(space.latitude.toString()) : undefined,
          longitude: space.longitude ? parseFloat(space.longitude.toString()) : undefined,
          distanceKm
        };
      }));

      // Separar espaços promovidos e normais
      const promotedSpaces = processedSpaces.filter(space => space.isPromoted);
      const normalSpaces = processedSpaces.filter(space => !space.isPromoted);

      // Para espaços promovidos, filtrar apenas os que estão dentro de 100km (se temos localização)
      let nearbyPromotedSpaces = promotedSpaces;
      if (location) {
        nearbyPromotedSpaces = promotedSpaces.filter(space => 
          space.distanceKm === undefined || space.distanceKm <= 100
        );
        console.log(`Espaços promovidos dentro de 100km: ${nearbyPromotedSpaces.length} de ${promotedSpaces.length}`);
      }

      // Ordenar espaços promovidos próximos por distância (mais próximos primeiro)
      nearbyPromotedSpaces.sort((a, b) => {
        if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      });

      // Combinar: espaços promovidos próximos primeiro, depois todos os outros
      const finalSpaces = [...nearbyPromotedSpaces, ...normalSpaces];

      setSpaces(finalSpaces);
      
      console.log('Total spaces processed:', finalSpaces.length);
      console.log('Promoted spaces nearby:', nearbyPromotedSpaces.length);
      console.log('Normal spaces:', normalSpaces.length);

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
    refetch: fetchSpacesWithPromotion,
    userLocation
  };
};
