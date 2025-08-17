
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
  latitude?: number;
  longitude?: number;
};

type OptimizedVendor = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  address: string;
  images: string[];
  isPromoted: boolean;
  promotionExpiresAt?: string;
  distanceKm?: number;
  instagram?: string | null;
};

type AppData = {
  spaces: OptimizedSpace[];
  vendors: OptimizedVendor[];
  loading: boolean;
  error: string | null;
};

// CACHE GLOBAL SINGLETON - uma fonte única de verdade
let globalCache: {
  spaces: OptimizedSpace[];
  vendors: OptimizedVendor[];
  lastFetch: number;
  isLoading: boolean;
} = {
  spaces: [],
  vendors: [],
  lastFetch: 0,
  isLoading: false
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
let activePromise: Promise<void> | null = null;

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

export const useAppData = () => {
  const [state, setState] = useState<AppData>({
    spaces: globalCache.spaces,
    vendors: globalCache.vendors,
    loading: globalCache.spaces.length === 0 && globalCache.vendors.length === 0,
    error: null
  });
  
  const { location: userLocation } = useUserLocation();

  const fetchAllData = async () => {
    const now = Date.now();
    
    // Se já tem uma requisição em andamento, aguardar ela
    if (activePromise) {
      console.log('🔄 APP_DATA: Waiting for existing fetch...');
      await activePromise;
      setState({
        spaces: globalCache.spaces,
        vendors: globalCache.vendors,
        loading: false,
        error: null
      });
      return;
    }

    // Verificar cache válido
    if (globalCache.spaces.length > 0 && globalCache.vendors.length > 0 && 
        now - globalCache.lastFetch < CACHE_DURATION) {
      const cacheMissingInstagram = globalCache.vendors.some((v: any) => v.instagram === undefined);
      if (!cacheMissingInstagram) {
        console.log('🎯 APP_DATA: Using valid cache');
        setState({
          spaces: globalCache.spaces,
          vendors: globalCache.vendors,
          loading: false,
          error: null
        });
        return;
      } else {
        console.log('♻️ APP_DATA: Cache missing instagram; refetching vendors.');
      }
    }

    // Evitar múltiplas requisições simultâneas
    if (globalCache.isLoading) {
      console.log('⏳ APP_DATA: Already loading, skipping...');
      return;
    }

    console.log('🚀 APP_DATA: Starting fresh data fetch...');
    const startTime = performance.now();
    
    globalCache.isLoading = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    activePromise = (async () => {
      try {
        // QUERY ÚNICA SUPER OTIMIZADA - buscar spaces e vendors em paralelo
        const [spacesResult, vendorsResult] = await Promise.all([
          // Spaces com JOIN otimizado
          supabase
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
            .order('created_at', { ascending: false }),

          // Vendors com JOIN otimizado
          supabase
            .from('vendors')
            .select(`
              id,
              name,
              category,
              contact_number,
              address,
              images,
              latitude,
              longitude,
              instagram,
              vendor_promotions!left (
                expires_at,
                active,
                payment_status
              )
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
        ]);

        const queryTime = performance.now();
        console.log(`⚡ APP_DATA: Queries completed in ${(queryTime - startTime).toFixed(0)}ms`);

        if (spacesResult.error) throw spacesResult.error;
        if (vendorsResult.error) throw vendorsResult.error;

        // Processar spaces
        const processedSpaces: OptimizedSpace[] = (spacesResult.data || []).map((space: any) => {
          const activePromotion = space.space_promotions?.find((p: any) => 
            p.active && 
            p.payment_status === 'approved' && 
            new Date(p.expires_at) > new Date()
          );
          
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
            latitude: space.latitude ? parseFloat(space.latitude.toString()) : undefined,
            longitude: space.longitude ? parseFloat(space.longitude.toString()) : undefined,
          };
        });

        // Processar vendors
        const processedVendors: OptimizedVendor[] = (vendorsResult.data || []).map((vendor: any) => {
          const activePromotion = vendor.vendor_promotions?.find((p: any) => 
            p.active && 
            p.payment_status === 'approved' && 
            new Date(p.expires_at) > new Date()
          );

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
            category: vendor.category,
            contact_number: vendor.contact_number,
            address: vendor.address,
            images: vendor.images || [],
            isPromoted: !!activePromotion,
            promotionExpiresAt: activePromotion?.expires_at,
            distanceKm,
            instagram: vendor.instagram ?? null,
          };
        });

        // Ordenar por promoção e proximidade
        const sortByPromotionAndDistance = <T extends { isPromoted: boolean; distanceKm?: number }>(items: T[]): T[] => {
          const promoted = items.filter(item => item.isPromoted);
          const regular = items.filter(item => !item.isPromoted);

          if (userLocation) {
            promoted.sort((a, b) => {
              if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
              if (a.distanceKm === undefined) return 1;
              if (b.distanceKm === undefined) return -1;
              return a.distanceKm - b.distanceKm;
            });

            regular.sort((a, b) => {
              if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
              if (a.distanceKm === undefined) return 1;
              if (b.distanceKm === undefined) return -1;
              return a.distanceKm - b.distanceKm;
            });
          }

          return [...promoted, ...regular];
        };

        const finalSpaces = sortByPromotionAndDistance(processedSpaces);
        const finalVendors = sortByPromotionAndDistance(processedVendors);

        // Atualizar cache global
        globalCache.spaces = finalSpaces;
        globalCache.vendors = finalVendors;
        globalCache.lastFetch = now;

        setState({
          spaces: finalSpaces,
          vendors: finalVendors,
          loading: false,
          error: null
        });

        const endTime = performance.now();
        console.log(`🎉 APP_DATA: Total processing time: ${(endTime - startTime).toFixed(0)}ms - Spaces: ${finalSpaces.length}, Vendors: ${finalVendors.length}`);

      } catch (err) {
        console.error('💥 APP_DATA: Error:', err);
        const errorMessage = 'Erro ao carregar dados';
        setState({
          spaces: [],
          vendors: [],
          loading: false,
          error: errorMessage
        });
        toast.error(errorMessage);
      } finally {
        globalCache.isLoading = false;
        activePromise = null;
      }
    })();

    await activePromise;
  };

  useEffect(() => {
    fetchAllData();
  }, []); // Executar apenas uma vez

  // Recalcular distâncias quando localização mudar (sem nova query)
  useEffect(() => {
    if (userLocation && (globalCache.spaces.length > 0 || globalCache.vendors.length > 0)) {
      console.log('📍 APP_DATA: Recalculating distances...');
      
      const updatedSpaces = globalCache.spaces.map(space => {
        if (space.latitude && space.longitude) {
          const distanceKm = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            space.latitude,
            space.longitude
          );
          return { ...space, distanceKm };
        }
        return space;
      });

      const updatedVendors = globalCache.vendors.map(vendor => {
        if (vendor.distanceKm !== undefined) {
          // Assumir que vendors têm coordenadas para cálculo
          return vendor;
        }
        return vendor;
      });

      // Atualizar cache
      globalCache.spaces = updatedSpaces;
      globalCache.vendors = updatedVendors;
      
      setState(prev => ({
        ...prev,
        spaces: updatedSpaces,
        vendors: updatedVendors
      }));
    }
  }, [userLocation]);

  return {
    spaces: state.spaces,
    vendors: state.vendors,
    loading: state.loading,
    error: state.error,
    refetch: fetchAllData,
    userLocation: userLocation 
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null,
  };
};
