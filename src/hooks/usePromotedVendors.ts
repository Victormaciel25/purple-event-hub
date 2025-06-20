
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_CONSTANTS } from '@/config/app-config';

type PromotedVendor = {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  category: string;
  description: string;
  images: string[];
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

// Função para embaralhar array usando algoritmo Fisher-Yates
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const usePromotedVendors = () => {
  const [vendors, setVendors] = useState<PromotedVendor[]>([]);
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

  const fetchVendorsWithPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching vendors with promotions...');

      // Obter localização do usuário
      const location = await getUserLocation();
      setUserLocation(location);

      // Primeiro, buscar todos os fornecedores aprovados
      const { data: allVendors, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          id,
          name,
          address,
          contact_number,
          category,
          description,
          images,
          latitude,
          longitude
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (vendorsError) {
        console.error('Error fetching vendors:', vendorsError);
        throw vendorsError;
      }

      console.log('All vendors found:', allVendors?.length || 0);

      // Buscar promoções ativas com payment_status aprovado
      const { data: activePromotions, error: promotionsError } = await supabase
        .from('vendor_promotions')
        .select('vendor_id, expires_at, plan_id')
        .eq('active', true)
        .eq('payment_status', 'approved')
        .gt('expires_at', new Date().toISOString());

      if (promotionsError) {
        console.error('Error fetching promotions:', promotionsError);
        // Não falhar se não conseguir buscar promoções, apenas mostrar sem destaque
      }

      console.log('Active approved vendor promotions found:', activePromotions?.length || 0);

      // Criar um map de promoções por vendor_id
      const promotionsMap = new Map();
      (activePromotions || []).forEach(promo => {
        promotionsMap.set(promo.vendor_id, promo);
      });

      // Processar todos os fornecedores
      const processedVendors = (allVendors || []).map((vendor) => {
        const promotion = promotionsMap.get(vendor.id);
        const isPromoted = !!promotion;
        
        // Calcular distância se temos localização do usuário e do fornecedor
        let distanceKm: number | undefined;
        if (location && vendor.latitude && vendor.longitude) {
          distanceKm = calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(vendor.latitude.toString()),
            parseFloat(vendor.longitude.toString())
          );
        }
        
        return {
          id: vendor.id,
          name: vendor.name,
          address: vendor.address,
          contact_number: vendor.contact_number,
          category: vendor.category,
          description: vendor.description,
          images: vendor.images || [],
          isPromoted,
          promotionExpiresAt: promotion?.expires_at,
          latitude: vendor.latitude ? parseFloat(vendor.latitude.toString()) : undefined,
          longitude: vendor.longitude ? parseFloat(vendor.longitude.toString()) : undefined,
          distanceKm
        };
      });

      // Separar fornecedores promovidos e normais
      const promotedVendors = processedVendors.filter(vendor => vendor.isPromoted);
      const normalVendors = processedVendors.filter(vendor => !vendor.isPromoted);

      let finalVendors: PromotedVendor[] = [];

      if (location) {
        // Se temos localização, ordenar por proximidade
        // Para fornecedores promovidos, filtrar apenas os que estão dentro de 100km
        const nearbyPromotedVendors = promotedVendors.filter(vendor => 
          vendor.distanceKm === undefined || vendor.distanceKm <= 100
        );
        console.log(`Fornecedores promovidos dentro de 100km: ${nearbyPromotedVendors.length} de ${promotedVendors.length}`);

        // Ordenar fornecedores promovidos próximos por distância (mais próximos primeiro)
        nearbyPromotedVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Ordenar fornecedores normais por distância também (mais próximos primeiro)
        normalVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Combinar: fornecedores promovidos próximos primeiro, depois fornecedores normais ordenados por proximidade
        finalVendors = [...nearbyPromotedVendors, ...normalVendors];
        
        console.log('Vendors ordered by proximity');
        console.log('Promoted vendors nearby:', nearbyPromotedVendors.length);
        console.log('Normal vendors:', normalVendors.length);
      } else {
        // Se não temos localização, embaralhar de forma aleatória
        console.log('No user location - shuffling vendors randomly');
        
        // Embaralhar fornecedores promovidos e normais separadamente
        const shuffledPromotedVendors = shuffleArray(promotedVendors);
        const shuffledNormalVendors = shuffleArray(normalVendors);
        
        // Combinar: fornecedores promovidos embaralhados primeiro, depois fornecedores normais embaralhados
        finalVendors = [...shuffledPromotedVendors, ...shuffledNormalVendors];
        
        console.log('Vendors shuffled randomly');
        console.log('Promoted vendors:', shuffledPromotedVendors.length);
        console.log('Normal vendors:', shuffledNormalVendors.length);
      }

      setVendors(finalVendors);
      console.log('Total vendors processed:', finalVendors.length);

    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsWithPromotion();
  }, []);

  return {
    vendors,
    loading,
    error,
    refetch: fetchVendorsWithPromotion,
    userLocation
  };
};
