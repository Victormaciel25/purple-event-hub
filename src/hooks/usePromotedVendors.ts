import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Geolocation } from '@capacitor/geolocation';
import { Tables } from '@/integrations/supabase/types';

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

// Função para selecionar aleatoriamente até 3 fornecedores promovidos
const selectRandomPromotedVendors = (promotedVendors: PromotedVendor[]): PromotedVendor[] => {
  if (promotedVendors.length <= 3) {
    return shuffleArray(promotedVendors);
  }
  
  const shuffled = shuffleArray(promotedVendors);
  return shuffled.slice(0, 3);
};

export const usePromotedVendors = () => {
  const [vendors, setVendors] = useState<PromotedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const getUserLocation = async (): Promise<UserLocation | null> => {
    try {
      console.log('🔍 Requesting vendor location permissions...');
      
      // Verificar e solicitar permissões
      const permissions = await Geolocation.requestPermissions();
      console.log('📍 Vendor permissions result:', permissions);
      
      if (permissions.location === 'denied') {
        console.warn('⚠️ Vendor location permission denied');
        return null;
      }

      console.log('🌍 Getting vendor current position...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      console.log('✅ Vendor location obtained:', location);
      return location;
    } catch (error) {
      console.error('❌ Error getting vendor location:', error);
      
      // Fallback para web/navegador
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        console.log('🔄 Falling back to browser geolocation for vendors...');
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              console.log('✅ Vendor browser location obtained:', location);
              resolve(location);
            },
            (error) => {
              console.warn('⚠️ Vendor browser geolocation failed:', error);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            }
          );
        });
      }
      
      return null;
    }
  };

  const fetchVendorsWithPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Fetching vendors with promotions...');

      // Obter localização do usuário com timeout
      const locationPromise = getUserLocation();
      const timeoutPromise = new Promise<UserLocation | null>((resolve) => {
        setTimeout(() => resolve(null), 8000); // 8 segundos timeout
      });
      
      const location = await Promise.race([locationPromise, timeoutPromise]);
      setUserLocation(location);
      
      if (location) {
        console.log('📍 User location obtained for vendors');
      } else {
        console.log('⚠️ No user location - proceeding without location data for vendors');
      }

      // Primeiro, buscar todos os fornecedores aprovados com timeout
      const vendorsPromise = supabase
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

      const vendorsResult = await Promise.race([
        vendorsPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Vendors query timeout')), 10000)
        )
      ]);

      const { data: allVendors, error: vendorsError } = vendorsResult as any;

      if (vendorsError) {
        console.error('❌ Error fetching vendors:', vendorsError);
        throw vendorsError;
      }

      console.log('📋 All vendors found:', allVendors?.length || 0);

      // Buscar promoções ativas com payment_status aprovado com timeout
      let activePromotions: Tables<'vendor_promotions'>[] = [];
      try {
        const promotionsPromise = supabase
          .from('vendor_promotions')
          .select('vendor_id, expires_at, plan_id')
          .eq('active', true)
          .eq('payment_status', 'approved')
          .gt('expires_at', new Date().toISOString());

        const promotionsResult = await Promise.race([
          promotionsPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Vendor promotions query timeout')), 5000)
          )
        ]);
        
        const { data } = promotionsResult as any;
        activePromotions = data || [];
      } catch (error) {
        console.warn('⚠️ Failed to fetch vendor promotions, continuing without:', error);
      }

      console.log('🎯 Active approved vendor promotions found:', activePromotions.length);

      // Crear un map de promoções por vendor_id
      const promotionsMap = new Map();
      activePromotions.forEach(promo => {
        promotionsMap.set(promo.vendor_id, promo);
      });

      // Processar todos os fornecedores
      const processedVendors: PromotedVendor[] = (allVendors || []).map((vendor: any) => {
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
        // Se temos localização, filtrar fornecedores promovidos dentro de 100km
        const nearbyPromotedVendors = promotedVendors.filter(vendor => 
          vendor.distanceKm === undefined || vendor.distanceKm <= 100
        );
        console.log(`📍 Fornecedores promovidos dentro de 100km: ${nearbyPromotedVendors.length} de ${promotedVendors.length}`);

        // Ordenar fornecedores promovidos próximos por distância
        nearbyPromotedVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Selecionar aleatoriamente até 3 fornecedores promovidos próximos
        const selectedPromotedVendors = selectRandomPromotedVendors(nearbyPromotedVendors);

        // Ordenar fornecedores normais por distância
        normalVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Combinar: até 3 fornecedores promovidos selecionados no topo, depois fornecedores normais
        finalVendors = [...selectedPromotedVendors, ...normalVendors];
        
        console.log('✅ Vendors ordered by proximity');
        console.log(`🎯 Promoted vendors selected for top: ${selectedPromotedVendors.length} de ${nearbyPromotedVendors.length} nearby`);
        console.log('📋 Normal vendors:', normalVendors.length);
      } else {
        // Se não temos localização, selecionar aleatoriamente até 3 fornecedores promovidos
        const selectedPromotedVendors = selectRandomPromotedVendors(promotedVendors);
        const shuffledNormalVendors = shuffleArray(normalVendors);
        
        // Combinar: até 3 fornecedores promovidos selecionados no topo, depois fornecedores normais embaralhados
        finalVendors = [...selectedPromotedVendors, ...shuffledNormalVendors];
        
        console.log('✅ No user location - selected random promoted vendors');
        console.log(`🎯 Promoted vendors selected: ${selectedPromotedVendors.length} de ${promotedVendors.length} available`);
        console.log('📋 Normal vendors shuffled:', shuffledNormalVendors.length);
      }

      setVendors(finalVendors);
      console.log('🎉 Vendors loading completed successfully, total:', finalVendors.length);

    } catch (error) {
      console.error('💥 Error fetching vendors:', error);
      setError('Erro ao carregar fornecedores');
      toast.error("Erro ao carregar fornecedores. Tente novamente.");
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
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
  };
};
