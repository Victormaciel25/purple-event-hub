import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useUserLocation } from './useUserLocation';

type OptimizedSpace = {
  id: string;
  name: string;
  address?: string; // Only for authenticated users
  number?: string; // Only for authenticated users
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
        // Check if user is authenticated to determine data access level
        const { data: { user } } = await supabase.auth.getUser();
        const isAuthenticated = !!user;

        let spacesQuery;
        
        if (isAuthenticated) {
          // Authenticated users get full access to spaces table
          spacesQuery = supabase
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
        } else {
          // Anonymous users get limited public data
          spacesQuery = supabase
            .from('spaces_public')
            .select(`
              id,
              name,
              state,
              description,
              price,
              capacity,
              categories,
              latitude,
              longitude,
              created_at
            `)
            .order('created_at', { ascending: false });
        }

        // QUERY ÚNICA SUPER OTIMIZADA - buscar spaces e vendors em paralelo
        const [spacesResult, vendorsResult, promotionsResult, photosResult] = await Promise.all([
          spacesQuery,
          
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
            .order('created_at', { ascending: false }),
            
          // For anonymous users, fetch space promotions separately
          !isAuthenticated ? supabase
            .from("space_promotions")
            .select("space_id, expires_at")
            .eq("active", true)
            .eq("payment_status", "approved")
            .gte("expires_at", new Date().toISOString()) : Promise.resolve({ data: [] }),
            
          // For anonymous users, fetch space photos separately  
          !isAuthenticated ? supabase
            .from("space_photos")
            .select("space_id, storage_path")
            .order('created_at', { ascending: true }) : Promise.resolve({ data: [] })
        ]);

        const queryTime = performance.now();
        console.log(`⚡ APP_DATA: Queries completed in ${(queryTime - startTime).toFixed(0)}ms`);

        if (spacesResult.error) throw spacesResult.error;
        if (vendorsResult.error) throw vendorsResult.error;

        // Create promotion and photos maps for anonymous users
        const promotionMap = new Map();
        const photosMap = new Map();
        
        if (!isAuthenticated) {
          promotionsResult.data?.forEach(p => {
            promotionMap.set(p.space_id, p.expires_at);
          });
          
          photosResult.data?.forEach(p => {
            if (!photosMap.has(p.space_id)) {
              photosMap.set(p.space_id, []);
            }
            photosMap.get(p.space_id).push({ storage_path: p.storage_path });
          });
        }

        // Processar spaces
        const processedSpaces: OptimizedSpace[] = (spacesResult.data || []).map((space: any) => {
          let activePromotion;
          let spacePhotos;
          
          if (isAuthenticated) {
            activePromotion = space.space_promotions?.find((p: any) => 
              p.active && 
              p.payment_status === 'approved' && 
              new Date(p.expires_at) > new Date()
            );
            spacePhotos = space.space_photos || [];
          } else {
            activePromotion = promotionMap.has(space.id) ? { expires_at: promotionMap.get(space.id) } : null;
            spacePhotos = photosMap.get(space.id) || [];
          }
          
          let photoUrl = "";
          if (spacePhotos.length > 0) {
            const firstPhoto = spacePhotos[0];
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
            address: space.address, // Will be undefined for anonymous users
            number: space.number,   // Will be undefined for anonymous users
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
            instagram: vendor.instagram,
          };
        });

        // ORDENAÇÃO INTELIGENTE POR PROXIMIDADE
        if (userLocation) {
          processedSpaces.sort((a, b) => {
            // Primeiro por promoção
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            
            // Depois por proximidade
            if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
            if (a.distanceKm === undefined) return 1;
            if (b.distanceKm === undefined) return -1;
            return a.distanceKm - b.distanceKm;
          });

          processedVendors.sort((a, b) => {
            // Primeiro por promoção
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            
            // Depois por proximidade
            if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
            if (a.distanceKm === undefined) return 1;
            if (b.distanceKm === undefined) return -1;
            return a.distanceKm - b.distanceKm;
          });
        } else {
          // Sem localização: apenas ordenar por promoção
          processedSpaces.sort((a, b) => {
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            return 0;
          });

          processedVendors.sort((a, b) => {
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            return 0;
          });
        }

        // Atualizar cache global
        globalCache.spaces = processedSpaces;
        globalCache.vendors = processedVendors;
        globalCache.lastFetch = now;

        const endTime = performance.now();
        console.log(`✅ APP_DATA: Complete fetch in ${(endTime - startTime).toFixed(0)}ms - Spaces: ${processedSpaces.length}, Vendors: ${processedVendors.length}`);

        setState({
          spaces: processedSpaces,
          vendors: processedVendors,
          loading: false,
          error: null
        });

      } catch (error: any) {
        console.error('❌ APP_DATA: Error fetching data:', error);
        const errorMessage = error?.message || 'Erro ao carregar dados';
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
        
        if (!errorMessage.includes('timeout')) {
          toast.error(errorMessage);
        }
      } finally {
        globalCache.isLoading = false;
        activePromise = null;
      }
    })();

    await activePromise;
  };

  useEffect(() => {
    fetchAllData();
  }, [userLocation]);

  const refetch = () => {
    // Limpar cache para forçar nova busca
    globalCache.spaces = [];
    globalCache.vendors = [];
    globalCache.lastFetch = 0;
    fetchAllData();
  };

  return {
    ...state,
    refetch,
    userLocation
  };
};