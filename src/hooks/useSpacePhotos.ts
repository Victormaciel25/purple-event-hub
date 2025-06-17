
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
        // Log detalhado de cada mídia ANTES de qualquer processamento
        photosData.forEach((photo, index) => {
          console.log(`📁 ANÁLISE COMPLETA Mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            created_at: photo.created_at,
            // Análise detalhada do storage_path
            pathAnalysis: {
              fullPath: photo.storage_path,
              isURL: photo.storage_path?.startsWith('http'),
              containsVideo: photo.storage_path?.toLowerCase().includes('video'),
              extension: photo.storage_path?.split('.').pop()?.toLowerCase(),
              fileName: photo.storage_path?.split('/').pop(),
              // Verificar se contém extensões de vídeo conhecidas
              hasVideoExt: ['.mp4', '.webm', '.mov', '.avi'].some(ext => 
                photo.storage_path?.toLowerCase().includes(ext)
              )
            }
          });
        });

        // Função de detecção de vídeo MELHORADA
        const isVideoFile = (storagePath: string) => {
          if (!storagePath) return false;
          
          const path = storagePath.toLowerCase();
          const fileName = storagePath.split('/').pop()?.toLowerCase() || '';
          const extension = fileName.split('.').pop() || '';
          
          console.log(`🎬 DETECÇÃO DE VÍDEO DETALHADA para: ${storagePath}`, {
            path,
            fileName,
            extension,
            checks: {
              hasVideoExtension: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].includes(`.${extension}`),
              pathContainsVideo: path.includes('video'),
              fileNameContainsVideo: fileName.includes('video'),
              isMP4: extension === 'mp4' || path.includes('.mp4'),
              isWebM: extension === 'webm' || path.includes('.webm'),
              isMOV: extension === 'mov' || path.includes('.mov')
            }
          });
          
          // Critérios mais específicos para detecção de vídeo
          const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
          const isVideo = videoExtensions.includes(extension) || 
                         path.includes('video') ||
                         videoExtensions.some(ext => path.includes(`.${ext}`));
          
          console.log(`🎯 RESULTADO DETECÇÃO: ${storagePath} -> ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
          return isVideo;
        };

        // Classificar mídias
        const videos = photosData.filter(p => isVideoFile(p.storage_path));
        const images = photosData.filter(p => !isVideoFile(p.storage_path));
        
        console.log("📊 CLASSIFICAÇÃO FINAL:", {
          total: photosData.length,
          videos: videos.length,
          images: images.length,
          videoList: videos.map(v => ({ id: v.id, path: v.storage_path })),
          imageList: images.map(i => ({ id: i.id, path: i.storage_path }))
        });

        // Ordenar: imagens primeiro, vídeos por último
        const sortedPhotos = [...images, ...videos];
        
        console.log("🎯 MÍDIAS ORDENADAS:", sortedPhotos.map(p => ({
          id: p.id,
          path: p.storage_path,
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

  const createPhotoUrls = async (photosData: SpacePhoto[]) => {
    try {
      console.log("🔗 CRIANDO URLs para", photosData.length, "fotos/vídeos");
      
      const urls = await Promise.all(
        photosData.map(async (photo, index) => {
          if (!photo.storage_path) {
            console.error("❌ CAMINHO AUSENTE para mídia:", photo.id);
            return null;
          }

          console.log(`🔄 PROCESSANDO mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            isFullURL: photo.storage_path.startsWith('http')
          });

          // Se já é uma URL completa, usar diretamente
          if (photo.storage_path.startsWith('http')) {
            console.log("✅ JÁ É URL COMPLETA:", photo.storage_path);
            return photo.storage_path;
          }

          // Tentar criar URL a partir do storage path
          try {
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`✅ URL PÚBLICA criada:`, {
                originalPath: photo.storage_path,
                url: publicUrlData.publicUrl
              });
              return publicUrlData.publicUrl;
            }
          } catch (urlError) {
            console.error("❌ ERRO ao criar URL:", urlError);
          }

          console.error(`❌ FALHA TOTAL para mídia:`, photo.storage_path);
          return null;
        })
      );

      const validUrls = urls.filter(url => url !== null) as string[];
      
      console.log("✨ RESUMO FINAL COMPLETO:");
      console.log("- URLs válidas criadas:", validUrls.length, "de", photosData.length, "mídias");
      console.log("- TODAS as URLs válidas:", validUrls);
      
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
