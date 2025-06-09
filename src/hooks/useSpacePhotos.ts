
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SpacePhoto } from "@/types/approval";

export const useSpacePhotos = (spaceId: string | null) => {
  const [photos, setPhotos] = useState<SpacePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async (id: string) => {
    try {
      setLoading(true);
      console.log("Buscando fotos para espaço:", id);

      const { data: photosData, error } = await supabase
        .from('space_photos')
        .select('*')
        .eq('space_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erro ao buscar fotos:", error);
        toast.error("Erro ao buscar fotos");
        return;
      }

      console.log("Fotos encontradas:", photosData?.length || 0);
      console.log("Dados das fotos:", photosData);
      
      setPhotos(photosData || []);
      
      if (photosData && photosData.length > 0) {
        await createPhotoUrls(photosData);
      } else {
        setPhotoUrls([]);
      }
    } catch (error) {
      console.error("Erro ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("Criando URLs para", photosData.length, "fotos");
      
      const urls = await Promise.all(
        photosData.map(async (photo) => {
          if (!photo.storage_path) {
            console.error("Caminho de armazenamento ausente para foto:", photo.id);
            return null;
          }

          console.log("Processando foto:", photo.id, "com storage_path:", photo.storage_path);

          try {
            // Usar URL pública diretamente já que agora temos acesso público de leitura
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);

            if (publicUrlData?.publicUrl) {
              console.log("URL pública criada para foto:", photo.id, "->", publicUrlData.publicUrl);
              return publicUrlData.publicUrl;
            }

            console.error("Não foi possível criar URL pública para foto:", photo.id);
            return null;
          } catch (err) {
            console.error("Erro ao criar URL para foto:", photo.id, err);
            return null;
          }
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("URLs válidas criadas:", validUrls.length, "de", photosData.length, "fotos");
      console.log("URLs válidas:", validUrls);
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  useEffect(() => {
    if (spaceId) {
      console.log("useSpacePhotos - spaceId mudou para:", spaceId);
      fetchPhotos(spaceId);
    } else {
      console.log("useSpacePhotos - spaceId é null, limpando fotos");
      setPhotos([]);
      setPhotoUrls([]);
    }
  }, [spaceId]);

  return {
    photos,
    photoUrls,
    loading,
    refetch: () => spaceId && fetchPhotos(spaceId)
  };
};
