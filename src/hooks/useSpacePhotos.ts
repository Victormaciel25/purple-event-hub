
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
      console.log("🔍 INICIANDO busca de fotos/vídeos para espaço:", id);

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

      console.log("📸 DADOS BRUTOS encontrados:", photosData?.length || 0);
      console.log("📋 TODOS os dados das mídias:", photosData);
      
      if (photosData && photosData.length > 0) {
        // Log detalhado de cada mídia antes da classificação
        photosData.forEach((photo, index) => {
          const isVideo = isVideoFile(photo.storage_path);
          console.log(`📁 ANÁLISE Mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            created_at: photo.created_at,
            isVideo: isVideo,
            fileExtension: getFileExtension(photo.storage_path),
            fileName: getFileName(photo.storage_path)
          });
        });

        // Contar vídeos e imagens ANTES da ordenação
        const videoCount = photosData.filter(p => isVideoFile(p.storage_path)).length;
        const imageCount = photosData.filter(p => !isVideoFile(p.storage_path)).length;
        
        console.log("📊 CONTAGEM ANTES DA ORDENAÇÃO:", {
          total: photosData.length,
          videos: videoCount,
          images: imageCount
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
        
        console.log("🎯 MÍDIAS ORDENADAS:", sortedPhotos.map(p => ({
          id: p.id,
          path: p.storage_path,
          fileName: getFileName(p.storage_path),
          isVideo: isVideoFile(p.storage_path)
        })));
        
        setPhotos(sortedPhotos);
        await createPhotoUrls(sortedPhotos);
      } else {
        console.log("⚠️ NENHUMA foto/vídeo encontrado para o espaço");
        setPhotos([]);
        setPhotoUrls([]);
      }
    } catch (error) {
      console.error("💥 ERRO GERAL ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileName = (storagePath: string) => {
    const parts = storagePath.split('/');
    return parts[parts.length - 1] || storagePath;
  };

  const getFileExtension = (storagePath: string) => {
    const fileName = getFileName(storagePath);
    const parts = fileName.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  };

  const isVideoFile = (storagePath: string) => {
    // Extensões de vídeo mais abrangentes
    const videoExtensions = [
      '.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', 
      '.3gp', '.flv', '.wmv', '.ogg', '.ogv', '.mpg', 
      '.mpeg', '.m2v', '.3g2', '.asf', '.rm', '.swf',
      '.f4v', '.f4p', '.f4a', '.f4b'
    ];
    
    const fileName = getFileName(storagePath).toLowerCase();
    const pathLower = storagePath.toLowerCase();
    const extension = getFileExtension(storagePath);
    
    console.log(`🔍 DETECÇÃO DETALHADA para: ${storagePath}`, {
      fileName,
      pathLower,
      extension,
      originalPath: storagePath
    });
    
    // 1. Verificar extensões de vídeo
    const hasVideoExtension = videoExtensions.includes(extension);
    console.log(`📹 Extensão de vídeo (${extension}):`, hasVideoExtension);
    
    // 2. Verificar palavras-chave no caminho
    const videoKeywords = ['video', 'movie', 'film', 'clip', '/videos/', '_video_', '-video-', 'vid_', '_vid'];
    const hasVideoKeyword = videoKeywords.some(keyword => pathLower.includes(keyword));
    console.log(`🔤 Palavra-chave de vídeo:`, hasVideoKeyword, videoKeywords.filter(k => pathLower.includes(k)));
    
    // 3. Verificar MIME type no nome (se houver)
    const hasMimeIndicator = pathLower.includes('mp4') || 
                            pathLower.includes('webm') || 
                            pathLower.includes('mov') ||
                            pathLower.includes('avi');
    console.log(`🎭 Indicador MIME:`, hasMimeIndicator);
    
    // 4. Verificar padrões específicos no storage path
    const hasStorageVideoPattern = pathLower.includes('video') || 
                                  fileName.includes('video') ||
                                  /video.*\.(mp4|webm|mov|avi)/i.test(pathLower);
    console.log(`📁 Padrão de storage de vídeo:`, hasStorageVideoPattern);
    
    const result = hasVideoExtension || hasVideoKeyword || hasMimeIndicator || hasStorageVideoPattern;
    
    console.log(`🎬 RESULTADO FINAL DETECÇÃO:`, {
      storagePath: storagePath,
      fileName: fileName,
      extension: extension,
      hasVideoExtension,
      hasVideoKeyword,
      hasMimeIndicator,
      hasStorageVideoPattern,
      isVideo: result,
      detectedAs: result ? 'VÍDEO' : 'IMAGEM'
    });
    
    return result;
  };

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 CRIANDO URLs para", photosData.length, "fotos/vídeos");
      
      const urls = await Promise.all(
        photosData.map(async (photo, index) => {
          if (!photo.storage_path) {
            console.error("❌ CAMINHO AUSENTE para mídia:", photo.id);
            return null;
          }

          const isVideo = isVideoFile(photo.storage_path);
          const fileName = getFileName(photo.storage_path);
          
          console.log(`🔄 PROCESSANDO mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            fileName: fileName,
            isVideo: isVideo
          });

          // Verificar se o storage_path já é uma URL completa
          if (photo.storage_path.startsWith('http')) {
            console.log("✅ JÁ É URL COMPLETA:", photo.storage_path);
            return photo.storage_path;
          }

          try {
            // Primeiro tentar URL pública
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`✅ URL PÚBLICA criada para ${isVideo ? 'VÍDEO' : 'IMAGEM'}:`, {
                fileName: fileName,
                url: publicUrlData.publicUrl
              });
              return publicUrlData.publicUrl;
            }

            // Fallback para URL assinada se a pública não funcionar
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);

            if (signedUrlError) {
              console.error("❌ ERRO URL ASSINADA:", signedUrlError);
            } else if (signedUrlData?.signedUrl) {
              console.log(`✅ URL ASSINADA criada como fallback para ${isVideo ? 'VÍDEO' : 'IMAGEM'}:`, {
                fileName: fileName,
                url: signedUrlData.signedUrl
              });
              return signedUrlData.signedUrl;
            }
          } catch (urlError) {
            console.error("❌ ERRO ao processar URL:", urlError);
          }

          console.error(`❌ FALHA TOTAL para ${isVideo ? 'VÍDEO' : 'IMAGEM'}:`, fileName);
          return null;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      
      // Classificar URLs válidas usando a mesma função de detecção
      const validVideos = validUrls.filter(url => isVideoFile(url));
      const validImages = validUrls.filter(url => !isVideoFile(url));
      
      console.log("✨ RESUMO FINAL COMPLETO:");
      console.log("- URLs válidas criadas:", validUrls.length, "de", photosData.length, "mídias");
      console.log("- Vídeos encontrados:", validVideos.length);
      console.log("- Imagens encontradas:", validImages.length);
      console.log("- TODAS as URLs válidas:", validUrls);
      console.log("- URLs de VÍDEOS:", validVideos);
      console.log("- URLs de IMAGENS:", validImages);
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 ERRO FATAL ao criar URLs das mídias:", error);
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
        console.log("🔄 REFETCH MANUAL das fotos para espaço:", spaceId);
        fetchPhotos(spaceId);
      }
    }
  };
};
