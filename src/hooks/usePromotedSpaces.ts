
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
};

export const usePromotedSpaces = () => {
  const [spaces, setSpaces] = useState<PromotedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Buscar promoções ativas
      const now = new Date().toISOString();
      const { data: promotionsData } = await supabase
        .from("space_promotions")
        .select("space_id, expires_at")
        .eq("active", true)
        .eq("payment_status", "approved")
        .gte("expires_at", now);

      // Criar mapa de promoções
      const promotionMap = new Map(
        promotionsData?.map(p => [p.space_id, p.expires_at]) || []
      );

      // Processar espaços e buscar fotos
      const processedSpaces = await Promise.all(
        spacesData.map(async (space) => {
          const isPromoted = promotionMap.has(space.id);
          const photoUrl = await createPhotoUrl(space.id);

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
          };
        })
      );

      // Ordenar: promovidos primeiro
      const sortedSpaces = processedSpaces.sort((a, b) => {
        if (a.isPromoted && !b.isPromoted) return -1;
        if (!a.isPromoted && b.isPromoted) return 1;
        return 0;
      });

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
  };
};
