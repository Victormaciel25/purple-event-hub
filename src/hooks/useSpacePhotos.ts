
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
        .rpc('admin_get_space_photos', { space_id_param: id });

      if (error) {
        console.error("Erro ao buscar fotos:", error);
        toast.error("Erro ao buscar fotos");
        return;
      }

      console.log("Fotos encontradas:", photosData?.length || 0);
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

          try {
            // Tentar URL pública primeiro
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);

            if (publicUrlData?.publicUrl) {
              console.log("URL pública criada para foto:", photo.id);
              return publicUrlData.publicUrl;
            }

            // Fallback para URL assinada
            const { data: signedData, error: signedError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);

            if (signedError) {
              console.error("Erro ao criar URL assinada:", signedError);
              return null;
            }

            return signedData?.signedUrl || null;
          } catch (err) {
            console.error("Erro ao criar URL para foto:", photo.id, err);
            return null;
          }
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("URLs válidas criadas:", validUrls.length);
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  useEffect(() => {
    if (spaceId) {
      fetchPhotos(spaceId);
    } else {
      setPhotos([]);
      setPhotoUrls([]);
    }
  }, [spaceId]);

  return {
    photos,
    photoUrls,
    loading
  };
};
