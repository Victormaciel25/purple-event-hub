
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useUserLocation } from './useUserLocation';

type OptimizedSpace = {
  id: string;
  name: string;
  address: string;
  number: string;
  state: string;
  description: string;
  price: string;
  capacity: string;
  categories: string[];
  photo_url: string;
  isPromoted: boolean;
  promotionExpiresAt?: string;
  distanceKm?: number;
};

// Cache de resultados por 5 minutos
let cachedSpaces: OptimizedSpace[] = [];
let lastSpacesFetch: number = 0;
const SPACES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para calcular distância
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useOptimizedSpaces = () => {
  const [spaces, setSpaces] = useState<OptimizedSpace[]>(cachedSpaces);
  const [loading, setLoading] = useState(cachedSpaces.length === 0);
  const [error, setError] = useState<string | null>(null);
  const { location: userLocation } = useUserLocation();

  const fetchSpaces = async () => {
    const now = Date.now();
    
    // Usar cache se ainda válido
    if (cachedSpaces.length > 0 && now - lastSpacesFetch < SPACES_CACHE_DURATION) {
      console.log('🎯 SPACES: Using cached data');
      setSpaces(cachedSpaces);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 SPACES: Starting optimized fetch...');
      const startTime = performance.now();

      // QUERY ÚNICA OTIMIZADA: JOIN spaces + photos + promotions
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select(`
          id,
          name,
          address,
          number,
          state,
          description,
          price,
          capacity,
          categories,
          latitude,
          longitude,
          space_photos!left (
            storage_path
          ),
          space_promotions!left (
            expires_at,
            active,
            payment_status
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (spacesError) {
        console.error('❌ SPACES: Query error:', spacesError);
        throw spacesError;
      }

      const queryTime = performance.now();
      console.log(`⚡ SPACES: Query completed in ${(queryTime - startTime).toFixed(0)}ms`);

      // Processar dados de forma otimizada
      const processedSpaces: OptimizedSpace[] = (spacesData || []).map((space: any) => {
        // Verificar promoção ativa
        const activePromotion = space.space_promotions?.find((p: any) => 
          p.active && 
          p.payment_status === 'approved' && 
          new Date(p.expires_at) > new Date()
        );
        
        // URL da primeira foto (usando URL pública para performance)
        let photoUrl = "";
        if (space.space_photos?.length > 0) {
          const firstPhoto = space.space_photos[0];
          if (firstPhoto.storage_path?.startsWith('http')) {
            photoUrl = firstPhoto.storage_path;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("spaces")
              .getPublicUrl(firstPhoto.storage_path);
            photoUrl = publicUrlData?.publicUrl || "";
          }
        }

        // Calcular distância se temos localização
        let distanceKm: number | undefined;
        if (userLocation && space.latitude && space.longitude) {
          distanceKm = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
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
          description: space.description,
          price: space.price,
          capacity: space.capacity,
          categories: space.categories || [],
          photo_url: photoUrl,
          isPromoted: !!activePromotion,
          promotionExpiresAt: activePromotion?.expires_at,
          distanceKm,
        };
      });

      // Ordenar: promovidos primeiro, depois por proximidade
      const promotedSpaces = processedSpaces.filter(s => s.isPromoted);
      const regularSpaces = processedSpaces.filter(s => !s.isPromoted);

      if (userLocation) {
        promotedSpaces.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        regularSpaces.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }

      const finalSpaces = [...promotedSpaces, ...regularSpaces];

      // Atualizar cache
      cachedSpaces = finalSpaces;
      lastSpacesFetch = now;
      
      setSpaces(finalSpaces);
      
      const endTime = performance.now();
      console.log(`🎉 SPACES: Total processing time: ${(endTime - startTime).toFixed(0)}ms, spaces: ${finalSpaces.length}`);

    } catch (err) {
      console.error('💥 SPACES: Error:', err);
      setError('Erro ao carregar espaços');
      toast.error('Erro ao carregar espaços. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  return {
    spaces,
    loading,
    error,
    refetch: fetchSpaces,
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
  };
};
