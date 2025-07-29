
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SpacePhoto {
  id: string;
  space_id: string;
  storage_path: string;
  created_at: string;
}

export const useSpacePhotos = (spaceId: string | null) => {
  const [photos, setPhotos] = useState<SpacePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async (id: string) => {
    try {
      setLoading(true);
      console.log("🔍 ADMIN: Buscando fotos para espaço:", id);

      // Limpar estado anterior
      setPhotos([]);
      setPhotoUrls([]);

      // Usar a função admin para buscar fotos
      const { data: photosData, error } = await supabase
        .rpc('admin_get_space_photos', { space_id_param: id });

      if (error) {
        console.error("❌ ADMIN: Erro ao buscar fotos:", error);
        toast.error("Erro ao buscar fotos");
        return;
      }

      console.log("📸 ADMIN: Fotos encontradas:", photosData?.length || 0);
      
      if (photosData && photosData.length > 0) {
        setPhotos(photosData);
        await createPhotoUrls(photosData);
      } else {
        console.log("⚠️ ADMIN: Nenhuma foto encontrada para o espaço");
        setPhotoUrls([]);
      }
    } catch (error) {
      console.error("💥 ADMIN: Erro ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 ADMIN: Criando URLs para", photosData.length, "fotos");
      
      // Processar todas as URLs em paralelo para carregamento mais rápido
      const urls = photosData.map((photo) => {
        if (!photo.storage_path) {
          console.error("❌ ADMIN: Caminho ausente para foto:", photo.id);
          return null;
        }

        console.log(`🔄 ADMIN: Processando foto:`, {
          id: photo.id,
          storage_path: photo.storage_path,
          isFullURL: photo.storage_path.startsWith('http')
        });

        // Se já é uma URL completa, usar diretamente
        if (photo.storage_path.startsWith('http')) {
          console.log("✅ ADMIN: Já é URL completa:", photo.storage_path);
          return photo.storage_path;
        }

        // Criar URL pública a partir do storage path
        const { data: publicUrlData } = supabase.storage
          .from('spaces')
          .getPublicUrl(photo.storage_path);
        
        if (publicUrlData?.publicUrl) {
          console.log(`✅ ADMIN: URL pública criada:`, publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }

        console.error(`❌ ADMIN: Falha para foto:`, photo.storage_path);
        return null;
      });

      const validUrls = urls.filter(url => url !== null) as string[];
      
      console.log("✨ ADMIN: URLs válidas criadas:", validUrls.length, "de", photosData.length, "fotos");
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 ADMIN: Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  useEffect(() => {
    if (spaceId) {
      console.log("🔄 ADMIN useSpacePhotos - spaceId mudou para:", spaceId);
      fetchPhotos(spaceId);
    } else {
      console.log("🧹 ADMIN useSpacePhotos - spaceId é null, limpando fotos");
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
        console.log("🔄 ADMIN: Refetch manual das fotos para espaço:", spaceId);
        fetchPhotos(spaceId);
      }
    }
  };
};
