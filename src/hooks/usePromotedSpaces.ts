
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserLocation } from "./useUserLocation";

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
  const { location: userLocation } = useUserLocation();

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🚀 SPACES: Fetching approved spaces with optimized query...");
      
      // Consulta otimizada: JOIN spaces com photos em uma única query
      const spacesPromise = supabase
        .from("spaces")
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
          space_photos (
            storage_path
          )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      const spacesResult = await Promise.race([
        spacesPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Spaces query timeout')), 5000)
        )
      ]);

      const { data: spacesData, error: spacesError } = spacesResult as any;

      if (spacesError) {
        console.error('❌ SPACES: Error fetching spaces:', spacesError);
        throw spacesError;
      }

      if (!spacesData) {
        console.log('📋 SPACES: No spaces found');
        setSpaces([]);
        return;
      }

      console.log("📋 SPACES: Spaces found:", spacesData.length);

      // Buscar promoções ativas de forma otimizada
      const now = new Date().toISOString();
      let promotionsData = null;
      try {
        const promotionsPromise = supabase
          .from("space_promotions")
          .select("space_id, expires_at")
          .eq("active", true)
          .eq("payment_status", "approved")
          .gte("expires_at", now);

        const promotionsResult = await Promise.race([
          promotionsPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Promotions query timeout')), 3000)
          )
        ]);
        promotionsData = (promotionsResult as any).data;
      } catch (error) {
        console.warn('⚠️ SPACES: Failed to fetch promotions, continuing without:', error);
      }

      console.log("🎯 SPACES: Active promotions found:", promotionsData?.length || 0);

      // Criar mapa de promoções para lookup rápido
      const promotionMap = new Map(
        promotionsData?.map(p => [p.space_id, p.expires_at]) || []
      );

      // Processar espaços de forma otimizada
      const processedSpaces: PromotedSpace[] = spacesData.map((space: any) => {
        const isPromoted = promotionMap.has(space.id);
        
        // Usar apenas URL pública da primeira foto (mais rápido)
        let photoUrl = "";
        if (space.space_photos?.length > 0) {
          const firstPhoto = space.space_photos[0];
          if (firstPhoto.storage_path?.startsWith('http')) {
            photoUrl = firstPhoto.storage_path;
          } else {
            // URL pública é mais rápida que assinada
            const { data: publicUrlData } = supabase.storage
              .from("spaces")
              .getPublicUrl(firstPhoto.storage_path);
            photoUrl = publicUrlData?.publicUrl || "";
          }
        }

        // Calcular distância se temos localização do usuário e do espaço
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
          isPromoted,
          promotionExpiresAt: promotionMap.get(space.id),
          distanceKm,
        };
      });

      // Separar espaços promovidos e regulares
      const promotedSpaces = processedSpaces.filter(space => space.isPromoted);
      const regularSpaces = processedSpaces.filter(space => !space.isPromoted);

      if (userLocation) {
        // Ordenar por proximidade
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

        console.log("✅ SPACES: Spaces sorted by proximity:", processedSpaces.length);
      } else {
        console.log("✅ SPACES: Spaces processed without location:", processedSpaces.length);
      }

      // Selecionar até 3 espaços promovidos aleatoriamente
      const selectedPromotedSpaces = selectRandomPromotedSpaces(promotedSpaces);
      
      console.log(`🎯 SPACES: Promoted spaces selected: ${selectedPromotedSpaces.length} of ${promotedSpaces.length} available`);

      // Combinar: até 3 espaços promovidos no topo, depois espaços regulares
      const sortedSpaces = [...selectedPromotedSpaces, ...regularSpaces];

      setSpaces(sortedSpaces);
      console.log("🎉 SPACES: Loading completed successfully");
    } catch (err) {
      console.error("💥 SPACES: Error loading spaces:", err);
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
