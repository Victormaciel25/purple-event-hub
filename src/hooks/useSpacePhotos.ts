
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
      console.log("🔍 Buscando fotos/vídeos para espaço:", id);

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

      console.log("📸 Mídias encontradas:", photosData?.length || 0);
      console.log("📋 Dados completos das mídias:", photosData);
      
      if (photosData && photosData.length > 0) {
        // Log detalhado de cada mídia
        photosData.forEach((photo, index) => {
          const isVideo = isVideoFile(photo.storage_path);
          console.log(`📁 Mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            created_at: photo.created_at,
            isVideo: isVideo,
            fileExtension: getFileExtension(photo.storage_path)
          });
        });

        // Ordenar as mídias: imagens primeiro, vídeos por último
        const sortedPhotos = photosData.sort((a, b) => {
          const aIsVideo = isVideoFile(a.storage_path);
          const bIsVideo = isVideoFile(b.storage_path);
          
          // Se a é vídeo e b não é, a vem depois
          if (aIsVideo && !bIsVideo) return 1;
          // Se b é vídeo e a não é, b vem depois
          if (!aIsVideo && bIsVideo) return -1;
          // Se ambos são do mesmo tipo, manter ordem original por created_at
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        console.log("🎯 Mídias ordenadas:", sortedPhotos.map(p => ({
          id: p.id,
          path: p.storage_path,
          isVideo: isVideoFile(p.storage_path)
        })));
        
        setPhotos(sortedPhotos);
        await createPhotoUrls(sortedPhotos);
      } else {
        console.log("⚠️ Nenhuma foto/vídeo encontrado para o espaço");
        setPhotos([]);
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

  const getFileExtension = (storagePath: string) => {
    const parts = storagePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  };

  const isVideoFile = (storagePath: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv'];
    const pathLower = storagePath.toLowerCase();
    
    // Verificar extensões de vídeo
    const hasVideoExtension = videoExtensions.some(ext => pathLower.includes(ext));
    
    // Verificar se contém palavras-chave de vídeo no nome
    const hasVideoKeyword = pathLower.includes('video') || 
                           pathLower.includes('movie') ||
                           pathLower.includes('/videos/') ||
                           pathLower.includes('_video_') ||
                           pathLower.includes('-video-');
    
    const result = hasVideoExtension || hasVideoKeyword;
    
    console.log(`🎬 Verificando se é vídeo:`, {
      path: storagePath,
      hasVideoExtension,
      hasVideoKeyword,
      isVideo: result,
      extensions: videoExtensions.filter(ext => pathLower.includes(ext))
    });
    
    return result;
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 Criando URLs para", photosData.length, "fotos/vídeos");
      
      const urls = await Promise.all(
        photosData.map(async (photo, index) => {
          if (!photo.storage_path) {
            console.error("❌ Caminho de armazenamento ausente para mídia:", photo.id);
            return null;
          }

          const isVideo = isVideoFile(photo.storage_path);
          console.log(`🔄 Processando mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            isVideo: isVideo
          });

          // Verificar se o storage_path já é uma URL completa
          if (photo.storage_path.startsWith('http')) {
            console.log("✅ Storage path já é uma URL completa:", photo.storage_path);
            return photo.storage_path;
          }

          try {
            // Primeiro tentar URL pública (mais confiável com as novas políticas)
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`✅ URL pública criada para ${isVideo ? 'vídeo' : 'imagem'}:`, publicUrlData.publicUrl);
              return publicUrlData.publicUrl;
            }

            // Fallback para URL assinada se a pública não funcionar
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);

            if (signedUrlError) {
              console.error("❌ Erro ao criar URL assinada:", signedUrlError);
            } else if (signedUrlData?.signedUrl) {
              console.log(`✅ URL assinada criada como fallback para ${isVideo ? 'vídeo' : 'imagem'}:`, signedUrlData.signedUrl);
              return signedUrlData.signedUrl;
            }
          } catch (urlError) {
            console.error("❌ Erro ao processar URL:", urlError);
          }

          console.error(`❌ Não foi possível criar URL para ${isVideo ? 'vídeo' : 'imagem'}:`, photo.id);
          return null;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      
      // Log detalhado das URLs criadas
      validUrls.forEach((url, index) => {
        const photo = photosData[index];
        const isVideo = photo ? isVideoFile(photo.storage_path) : false;
        console.log(`🎯 URL ${index + 1} (${isVideo ? 'VÍDEO' : 'IMAGEM'}):`, url);
      });
      
      console.log("✨ RESUMO FINAL:");
      console.log("- URLs válidas criadas:", validUrls.length, "de", photosData.length, "mídias");
      console.log("- Todas as URLs válidas:", validUrls);
      console.log("- Contadores por tipo:", {
        videos: validUrls.filter(url => isVideoFile(url)).length,
        images: validUrls.filter(url => !isVideoFile(url)).length
      });
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 Erro ao criar URLs das mídias:", error);
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
