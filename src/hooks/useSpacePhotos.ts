
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
      console.log("🔍 Buscando fotos para espaço:", id);

      // Limpar estado anterior
      setPhotos([]);
      setPhotoUrls([]);

      // Buscar fotos da tabela space_photos
      const { data: photosData, error } = await supabase
        .from('space_photos')
        .select('*')
        .eq('space_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar fotos:", error);
        toast.error("Erro ao buscar fotos");
        return;
      }

      console.log("📸 Fotos encontradas:", photosData?.length || 0);
      
      if (photosData && photosData.length > 0) {
        setPhotos(photosData);
        await createPhotoUrls(photosData);
      } else {
        console.log("⚠️ Nenhuma foto encontrada para o espaço");
        setPhotoUrls([]);
      }
    } catch (error) {
      console.error("💥 Erro ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 Criando URLs para", photosData.length, "fotos");
      
      const urls = await Promise.all(
        photosData.map(async (photo, index) => {
          if (!photo.storage_path) {
            console.error("❌ Caminho ausente para foto:", photo.id);
            return null;
          }

          console.log(`🔄 Processando foto ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            isFullURL: photo.storage_path.startsWith('http')
          });

          // Se já é uma URL completa, usar diretamente
          if (photo.storage_path.startsWith('http')) {
            console.log("✅ Já é URL completa:", photo.storage_path);
            return photo.storage_path;
          }

          // Criar URL pública a partir do storage path
          try {
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`✅ URL pública criada:`, {
                originalPath: photo.storage_path,
                url: publicUrlData.publicUrl
              });
              return publicUrlData.publicUrl;
            }
          } catch (urlError) {
            console.error("❌ Erro ao criar URL pública:", urlError);
          }

          console.error(`❌ Falha para foto:`, photo.storage_path);
          return null;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      
      console.log("✨ URLs válidas criadas:", validUrls.length, "de", photosData.length, "fotos");
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  useEffect(() => {
    if (spaceId) {
      console.log("🔄 useSpacePhotos - spaceId mudou para:", spaceId);
      const timer = setTimeout(() => {
        fetchPhotos(spaceId);
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      console.log("🧹 useSpacePhotos - spaceId é null, limpando fotos");
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
        console.log("🔄 Refetch manual das fotos para espaço:", spaceId);
        fetchPhotos(spaceId);
      }
    }
  };
};
