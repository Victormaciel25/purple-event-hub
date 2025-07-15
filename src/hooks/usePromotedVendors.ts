
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useUserLocation } from './useUserLocation';
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
  const { location: userLocation } = useUserLocation();

  const fetchVendorsWithPromotion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 VENDORS: Fetching vendors with promotions...');

      // Buscar fornecedores aprovados com timeout otimizado
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
          setTimeout(() => reject(new Error('Vendors query timeout')), 5000)
        )
      ]);

      const { data: allVendors, error: vendorsError } = vendorsResult as any;

      if (vendorsError) {
        console.error('❌ VENDORS: Error fetching vendors:', vendorsError);
        throw vendorsError;
      }

      console.log('📋 VENDORS: All vendors found:', allVendors?.length || 0);

      // Buscar promoções ativas com timeout otimizado
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
            setTimeout(() => reject(new Error('Vendor promotions query timeout')), 3000)
          )
        ]);
        
        const { data } = promotionsResult as any;
        activePromotions = data || [];
      } catch (error) {
        console.warn('⚠️ VENDORS: Failed to fetch promotions, continuing without:', error);
      }

      console.log('🎯 VENDORS: Active promotions found:', activePromotions.length);

      // Crear mapa de promoções para lookup rápido
      const promotionsMap = new Map();
      activePromotions.forEach(promo => {
        promotionsMap.set(promo.vendor_id, promo);
      });

      // Processar fornecedores de forma otimizada
      const processedVendors: PromotedVendor[] = (allVendors || []).map((vendor: any) => {
        const promotion = promotionsMap.get(vendor.id);
        const isPromoted = !!promotion;
        
        // Calcular distância se temos localização do usuário e do fornecedor
        let distanceKm: number | undefined;
        if (userLocation && vendor.latitude && vendor.longitude) {
          distanceKm = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
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

      if (userLocation) {
        // Filtrar fornecedores promovidos dentro de 100km
        const nearbyPromotedVendors = promotedVendors.filter(vendor => 
          vendor.distanceKm === undefined || vendor.distanceKm <= 100
        );
        console.log(`📍 VENDORS: Promoted vendors within 100km: ${nearbyPromotedVendors.length} of ${promotedVendors.length}`);

        // Ordenar por distância
        nearbyPromotedVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        normalVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Selecionar até 3 fornecedores promovidos próximos
        const selectedPromotedVendors = selectRandomPromotedVendors(nearbyPromotedVendors);
        finalVendors = [...selectedPromotedVendors, ...normalVendors];
        
        console.log('✅ VENDORS: Vendors ordered by proximity');
        console.log(`🎯 VENDORS: Promoted selected: ${selectedPromotedVendors.length} of ${nearbyPromotedVendors.length} nearby`);
      } else {
        // Selecionar até 3 fornecedores promovidos aleatoriamente
        const selectedPromotedVendors = selectRandomPromotedVendors(promotedVendors);
        const shuffledNormalVendors = shuffleArray(normalVendors);
        finalVendors = [...selectedPromotedVendors, ...shuffledNormalVendors];
        
        console.log('✅ VENDORS: No location - selected random promoted vendors');
        console.log(`🎯 VENDORS: Promoted selected: ${selectedPromotedVendors.length} of ${promotedVendors.length} available`);
      }

      setVendors(finalVendors);
      console.log('🎉 VENDORS: Loading completed successfully, total:', finalVendors.length);

    } catch (error) {
      console.error('💥 VENDORS: Error fetching vendors:', error);
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
