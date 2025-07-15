
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Geolocation } from '@capacitor/geolocation';

type PromotedSpace = {
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

// Função para embaralhar array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Função para selecionar aleatoriamente até 3 espaços promovidos
const selectRandomPromotedSpaces = (promotedSpaces: PromotedSpace[]): PromotedSpace[] => {
  if (promotedSpaces.length <= 3) {
    return shuffleArray(promotedSpaces);
  }
  
  const shuffled = shuffleArray(promotedSpaces);
  return shuffled.slice(0, 3);
};

export const usePromotedSpaces = () => {
  const [spaces, setSpaces] = useState<PromotedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const getUserLocation = async (): Promise<UserLocation | null> => {
    try {
      console.log('🔍 Requesting location permissions...');
      
      // Verificar e solicitar permissões
      const permissions = await Geolocation.requestPermissions();
      console.log('📍 Permissions result:', permissions);
      
      if (permissions.location === 'denied') {
        console.warn('⚠️ Location permission denied');
        return null;
      }

      console.log('🌍 Getting current position...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      console.log('✅ Location obtained:', location);
      return location;
    } catch (error) {
      console.error('❌ Error getting location:', error);
      
      // Fallback para web/navegador
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        console.log('🔄 Falling back to browser geolocation...');
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              console.log('✅ Browser location obtained:', location);
              resolve(location);
            },
            (error) => {
              console.warn('⚠️ Browser geolocation failed:', error);
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

  const createPhotoUrl = async (spaceId: string): Promise<string> => {
    try {
      // Buscar a primeira foto do espaço
      const { data: photos } = await supabase
        .from('space_photos')
        .select('storage_path')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!photos || photos.length === 0) {
        return "";
      }

      const storagePath = photos[0].storage_path;
      
      // Se já é uma URL completa, retornar
      if (storagePath.startsWith('http')) {
        return storagePath;
      }

      // Tentar criar URL assinada
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('spaces')
        .createSignedUrl(storagePath, 3600);

      if (signedUrlError) {
        // Fallback para URL pública
        const { data: publicUrlData } = supabase.storage
          .from('spaces')
          .getPublicUrl(storagePath);
        
        return publicUrlData?.publicUrl || "";
      }

      return signedUrlData?.signedUrl || "";
    } catch (error) {
      console.error("Erro ao criar URL da foto:", error);
      return "";
    }
  };

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🚀 Buscando espaços aprovados...");
      
      // Obter localização do usuário com timeout
      const locationPromise = getUserLocation();
      const timeoutPromise = new Promise<UserLocation | null>((resolve) => {
        setTimeout(() => resolve(null), 8000); // 8 segundos timeout
      });
      
      const location = await Promise.race([locationPromise, timeoutPromise]);
      setUserLocation(location);
      
      if (location) {
        console.log('📍 User location obtained for spaces');
      } else {
        console.log('⚠️ No user location - proceeding without location data');
      }

      // Buscar espaços aprovados com timeout
      const spacesPromise = supabase
        .from("spaces")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      const spacesResult = await Promise.race([
        spacesPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Spaces query timeout')), 10000)
        )
      ]);

      const { data: spacesData, error: spacesError } = spacesResult as any;

      if (spacesError) {
        console.error('❌ Error fetching spaces:', spacesError);
        throw spacesError;
      }

      if (!spacesData) {
        console.log('📋 No spaces found');
        setSpaces([]);
        return;
      }

      console.log("📋 Espaços encontrados:", spacesData.length);

      // Buscar promoções ativas com timeout
      const now = new Date().toISOString();
      const promotionsPromise = supabase
        .from("space_promotions")
        .select("space_id, expires_at")
        .eq("active", true)
        .eq("payment_status", "approved")
        .gte("expires_at", now);

      let promotionsData = null;
      try {
        const promotionsResult = await Promise.race([
          promotionsPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Promotions query timeout')), 5000)
          )
        ]);
        promotionsData = (promotionsResult as any).data;
      } catch (error) {
        console.warn('⚠️ Failed to fetch promotions, continuing without:', error);
      }

      console.log("🎯 Promoções ativas encontradas:", promotionsData?.length || 0);

      // Criar mapa de promoções
      const promotionMap = new Map(
        promotionsData?.map(p => [p.space_id, p.expires_at]) || []
      );

      // Processar espaços e buscar fotos
      const processedSpaces = await Promise.all(
        spacesData.map(async (space) => {
          const isPromoted = promotionMap.has(space.id);
          
          let photoUrl = "";
          try {
            photoUrl = await createPhotoUrl(space.id);
          } catch (error) {
            console.warn(`⚠️ Failed to get photo for space ${space.name}:`, error);
          }

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
            description: space.description,
            price: space.price,
            capacity: space.capacity,
            categories: space.categories || [],
            photo_url: photoUrl,
            isPromoted,
            promotionExpiresAt: promotionMap.get(space.id),
            distanceKm,
          };
        })
      );

      // Separar espaços promovidos e regulares
      const promotedSpaces = processedSpaces.filter(space => space.isPromoted);
      const regularSpaces = processedSpaces.filter(space => !space.isPromoted);

      if (location) {
        // Se temos localização, ordenar espaços promovidos por proximidade primeiro
        promotedSpaces.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        // Ordenar espaços regulares por proximidade
        regularSpaces.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        console.log("✅ Espaços processados e ordenados por proximidade:", processedSpaces.length);
      } else {
        console.log("✅ Espaços processados sem localização:", processedSpaces.length);
      }

      // Selecionar aleatoriamente até 3 espaços promovidos para aparecer no topo
      const selectedPromotedSpaces = selectRandomPromotedSpaces(promotedSpaces);
      
      console.log(`🎯 Espaços promovidos selecionados para o topo: ${selectedPromotedSpaces.length} de ${promotedSpaces.length} disponíveis`);

      // Combinar: até 3 espaços promovidos selecionados aleatoriamente no topo, depois espaços regulares
      const sortedSpaces = [...selectedPromotedSpaces, ...regularSpaces];

      setSpaces(sortedSpaces);
      console.log("🎉 Spaces loading completed successfully");
    } catch (err) {
      console.error("💥 Erro ao buscar espaços promovidos:", err);
      setError("Erro ao carregar espaços");
      toast.error("Erro ao carregar espaços. Tente novamente.");
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
