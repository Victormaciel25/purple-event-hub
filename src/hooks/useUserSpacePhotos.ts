
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SpacePhoto {
  id: string;
  space_id: string;
  storage_path: string;
  created_at: string;
}

export const useUserSpacePhotos = (spaceId: string | null) => {
  const [photos, setPhotos] = useState<SpacePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async (id: string) => {
    try {
      setLoading(true);
      console.log("🔍 USER_PHOTOS: Buscando fotos para espaço:", id);

      // Limpar estado anterior
      setPhotos([]);
      setPhotoUrls([]);

      // Buscar fotos do espaço do usuário atual
      const { data: photosData, error } = await supabase
        .from('space_photos')
        .select('id, space_id, storage_path, created_at')
        .eq('space_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("❌ USER_PHOTOS: Erro ao buscar fotos:", error);
        toast.error("Erro ao buscar fotos");
        return;
      }

      console.log("📸 USER_PHOTOS: Fotos encontradas:", photosData?.length || 0);
      
      if (photosData && photosData.length > 0) {
        setPhotos(photosData);
        await createPhotoUrls(photosData);
      } else {
        console.log("⚠️ USER_PHOTOS: Nenhuma foto encontrada para o espaço");
        setPhotoUrls([]);
      }
    } catch (error) {
      console.error("💥 USER_PHOTOS: Erro ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 USER_PHOTOS: Criando URLs para", photosData.length, "fotos");
      
      // Processar todas as URLs em paralelo para carregamento mais rápido
      const urls = photosData.map((photo) => {
        if (!photo.storage_path) {
          console.error("❌ USER_PHOTOS: Caminho ausente para foto:", photo.id);
          return null;
        }

        console.log(`🔄 USER_PHOTOS: Processando foto:`, {
          id: photo.id,
          storage_path: photo.storage_path,
          isFullURL: photo.storage_path.startsWith('http')
        });

        // Se já é uma URL completa, usar diretamente
        if (photo.storage_path.startsWith('http')) {
          console.log("✅ USER_PHOTOS: Já é URL completa:", photo.storage_path);
          return photo.storage_path;
        }

        // Criar URL pública a partir do storage path
        const { data: publicUrlData } = supabase.storage
          .from('spaces')
          .getPublicUrl(photo.storage_path);
        
        if (publicUrlData?.publicUrl) {
          console.log(`✅ USER_PHOTOS: URL pública criada:`, publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }

        console.error(`❌ USER_PHOTOS: Falha para foto:`, photo.storage_path);
        return null;
      });

      const validUrls = urls.filter(url => url !== null) as string[];
      
      console.log("✨ USER_PHOTOS: URLs válidas criadas:", validUrls.length, "de", photosData.length, "fotos");
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 USER_PHOTOS: Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  useEffect(() => {
    if (spaceId) {
      console.log("🔄 USER_PHOTOS useUserSpacePhotos - spaceId mudou para:", spaceId);
      fetchPhotos(spaceId);
    } else {
      console.log("🧹 USER_PHOTOS useUserSpacePhotos - spaceId é null, limpando fotos");
      setPhotos([]);
      setPhotoUrls([]);
    }
  }, [spaceId]);

  return {
    photos,
    photoUrls,
    loading,
    refetch: () => {
      if (spaceId) {
        console.log("🔄 USER_PHOTOS: Refetch manual das fotos para espaço:", spaceId);
        fetchPhotos(spaceId);
      }
    }
  };
};
