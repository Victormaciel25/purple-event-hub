
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      console.log("Buscando espaços aprovados...");
      
      // Obter localização do usuário
      const location = await getUserLocation();
      setUserLocation(location);

      // Buscar espaços aprovados
      const { data: spacesData, error: spacesError } = await supabase
        .from("spaces")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (spacesError) {
        throw spacesError;
      }

      if (!spacesData) {
        setSpaces([]);
        return;
      }

      console.log("Espaços encontrados:", spacesData.length);

      // Buscar promoções ativas
      const now = new Date().toISOString();
      const { data: promotionsData } = await supabase
        .from("space_promotions")
        .select("space_id, expires_at")
        .eq("active", true)
        .eq("payment_status", "approved")
        .gte("expires_at", now);

      console.log("Promoções ativas encontradas:", promotionsData?.length || 0);

      // Criar mapa de promoções
      const promotionMap = new Map(
        promotionsData?.map(p => [p.space_id, p.expires_at]) || []
      );

      // Processar espaços e buscar fotos
      const processedSpaces = await Promise.all(
        spacesData.map(async (space) => {
          const isPromoted = promotionMap.has(space.id);
          const photoUrl = await createPhotoUrl(space.id);

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

      // Ordenar espaços: primeiro por promoção, depois por proximidade
      const sortedSpaces = processedSpaces.sort((a, b) => {
        // Primeiro critério: espaços promovidos vêm primeiro
        if (a.isPromoted && !b.isPromoted) return -1;
        if (!a.isPromoted && b.isPromoted) return 1;
        
        // Segundo critério: ordenar por proximidade
        if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      });

      console.log("Espaços processados e ordenados por proximidade:", sortedSpaces.length);
      if (location) {
        console.log("Espaços próximos (primeiros 3):", sortedSpaces.slice(0, 3).map(s => ({ 
          name: s.name, 
          distance: s.distanceKm ? `${s.distanceKm.toFixed(1)}km` : 'N/A',
          isPromoted: s.isPromoted 
        })));
      }

      setSpaces(sortedSpaces);
    } catch (err) {
      console.error("Erro ao buscar espaços promovidos:", err);
      setError("Erro ao carregar espaços");
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
    userLocation,
  };
};
