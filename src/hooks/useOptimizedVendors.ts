
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useUserLocation } from './useUserLocation';

type OptimizedVendor = {
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

// Cache de resultados por 5 minutos
let cachedVendors: OptimizedVendor[] = [];
let lastVendorsFetch: number = 0;
const VENDORS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

export const useOptimizedVendors = () => {
  const [vendors, setVendors] = useState<OptimizedVendor[]>(cachedVendors);
  const [loading, setLoading] = useState(cachedVendors.length === 0);
  const [error, setError] = useState<string | null>(null);
  const { location: userLocation } = useUserLocation();

  const fetchVendors = async () => {
    const now = Date.now();
    
    // Usar cache se ainda válido
    if (cachedVendors.length > 0 && now - lastVendorsFetch < VENDORS_CACHE_DURATION) {
      console.log('🎯 VENDORS: Using cached data');
      setVendors(cachedVendors);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 VENDORS: Starting optimized fetch...');
      const startTime = performance.now();

      // QUERY ÚNICA OTIMIZADA: JOIN vendors + promotions
      const { data: vendorsData, error: vendorsError } = await supabase
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
          longitude,
          vendor_promotions!left (
            expires_at,
            active,
            payment_status
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (vendorsError) {
        console.error('❌ VENDORS: Query error:', vendorsError);
        throw vendorsError;
      }

      const queryTime = performance.now();
      console.log(`⚡ VENDORS: Query completed in ${(queryTime - startTime).toFixed(0)}ms`);

      // Processar dados de forma otimizada
      const processedVendors: OptimizedVendor[] = (vendorsData || []).map((vendor: any) => {
        // Verificar promoção ativa
        const activePromotion = vendor.vendor_promotions?.find((p: any) => 
          p.active && 
          p.payment_status === 'approved' && 
          new Date(p.expires_at) > new Date()
        );

        // Calcular distância se temos localização
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
          isPromoted: !!activePromotion,
          promotionExpiresAt: activePromotion?.expires_at,
          latitude: vendor.latitude ? parseFloat(vendor.latitude.toString()) : undefined,
          longitude: vendor.longitude ? parseFloat(vendor.longitude.toString()) : undefined,
          distanceKm
        };
      });

      // Ordenar: promovidos primeiro, depois por proximidade
      const promotedVendors = processedVendors.filter(v => v.isPromoted);
      const regularVendors = processedVendors.filter(v => !v.isPromoted);

      if (userLocation) {
        promotedVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        regularVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }

      // Selecionar até 3 fornecedores promovidos próximos
      const selectedPromoted = promotedVendors.slice(0, 3);
      const finalVendors = [...selectedPromoted, ...regularVendors];

      // Atualizar cache
      cachedVendors = finalVendors;
      lastVendorsFetch = now;
      
      setVendors(finalVendors);
      
      const endTime = performance.now();
      console.log(`🎉 VENDORS: Total processing time: ${(endTime - startTime).toFixed(0)}ms, vendors: ${finalVendors.length}`);

    } catch (err) {
      console.error('💥 VENDORS: Error:', err);
      setError('Erro ao carregar fornecedores');
      toast.error('Erro ao carregar fornecedores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return {
    vendors,
    loading,
    error,
    refetch: fetchVendors,
    userLocation: userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
  };
};
