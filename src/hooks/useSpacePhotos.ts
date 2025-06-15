
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
      console.log("🔍 Buscando fotos para espaço:", id);

      // Limpar estado anterior
      setPhotos([]);
      setPhotoUrls([]);

      // Buscar fotos diretamente da tabela space_photos
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
      console.log("📋 Dados das fotos:", photosData);
      
      setPhotos(photosData || []);
      
      if (photosData && photosData.length > 0) {
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
        photosData.map(async (photo) => {
          if (!photo.storage_path) {
            console.error("❌ Caminho de armazenamento ausente para foto:", photo.id);
            return null;
          }

          console.log("🔄 Processando foto:", photo.id, "com storage_path:", photo.storage_path);

          // Verificar se o storage_path já é uma URL completa
          if (photo.storage_path.startsWith('http')) {
            console.log("✅ Storage path já é uma URL completa:", photo.storage_path);
            return photo.storage_path;
          }

          try {
            // Criar URL assinada com validade de 1 hora
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);

            if (signedUrlError) {
              console.error("❌ Erro ao criar URL assinada:", signedUrlError);
              // Tentar URL pública como fallback
              const { data: publicUrlData } = supabase.storage
                .from('spaces')
                .getPublicUrl(photo.storage_path);
              
              if (publicUrlData?.publicUrl) {
                console.log("✅ URL pública criada como fallback:", publicUrlData.publicUrl);
                return publicUrlData.publicUrl;
              }
            } else if (signedUrlData?.signedUrl) {
              console.log("✅ URL assinada criada:", signedUrlData.signedUrl);
              return signedUrlData.signedUrl;
            }
          } catch (urlError) {
            console.error("❌ Erro ao processar URL:", urlError);
          }

          console.error("❌ Não foi possível criar URL para foto:", photo.id);
          return null;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("🎯 URLs válidas criadas:", validUrls.length, "de", photosData.length, "fotos");
      console.log("🔗 URLs válidas:", validUrls);
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 Erro ao criar URLs das fotos:", error);
      setPhotoUrls([]);
    }
  };

  // Force refresh quando spaceId muda
  useEffect(() => {
    if (spaceId) {
      console.log("🔄 useSpacePhotos - spaceId mudou para:", spaceId);
      // Delay pequeno para garantir que o modal esteja totalmente carregado
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
