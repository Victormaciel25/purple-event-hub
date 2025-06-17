
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
      
      // SEMPRE buscar arquivos diretamente do bucket para garantir que não percamos nada
      const bucketFiles = await fetchFromBucket(id);
      
      if (photosData && photosData.length > 0) {
        // Log detalhado de cada mídia ANTES de qualquer processamento
        photosData.forEach((photo, index) => {
          console.log(`📁 ANÁLISE COMPLETA Mídia ${index + 1}:`, {
            id: photo.id,
            storage_path: photo.storage_path,
            created_at: photo.created_at,
            pathAnalysis: {
              fullPath: photo.storage_path,
              isURL: photo.storage_path?.startsWith('http'),
              containsVideo: photo.storage_path?.toLowerCase().includes('video'),
              extension: photo.storage_path?.split('.').pop()?.toLowerCase(),
              fileName: photo.storage_path?.split('/').pop(),
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
          
          const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
          const isVideo = videoExtensions.includes(extension) || 
                         path.includes('video') ||
                         videoExtensions.some(ext => path.includes(`.${ext}`));
          
          console.log(`🎯 RESULTADO DETECÇÃO: ${storagePath} -> ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
          return isVideo;
        };

        // Classificar mídias da tabela
        const videosFromTable = photosData.filter(p => isVideoFile(p.storage_path));
        const imagesFromTable = photosData.filter(p => !isVideoFile(p.storage_path));
        
        console.log("📊 CLASSIFICAÇÃO DA TABELA:", {
          total: photosData.length,
          videos: videosFromTable.length,
          images: imagesFromTable.length,
          videoList: videosFromTable.map(v => ({ id: v.id, path: v.storage_path })),
          imageList: imagesFromTable.map(i => ({ id: i.id, path: i.storage_path }))
        });

        // Combinar dados da tabela com dados do bucket
        const allPhotos = [...photosData];
        
        // Adicionar arquivos do bucket que não estão na tabela
        bucketFiles.forEach(bucketFile => {
          const existsInTable = photosData.some(p => 
            p.storage_path === bucketFile.storage_path || 
            p.storage_path.includes(bucketFile.fileName)
          );
          
          if (!existsInTable) {
            console.log("🔥 ADICIONANDO arquivo do bucket que não está na tabela:", bucketFile);
            allPhotos.push({
              id: `bucket-${bucketFile.fileName}`,
              space_id: id,
              storage_path: bucketFile.storage_path,
              created_at: new Date().toISOString()
            });
          }
        });

        // Reclassificar com todos os arquivos
        const videos = allPhotos.filter(p => isVideoFile(p.storage_path));
        const images = allPhotos.filter(p => !isVideoFile(p.storage_path));
        
        console.log("📊 CLASSIFICAÇÃO FINAL (TABELA + BUCKET):", {
          total: allPhotos.length,
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
        console.log("⚠️ NENHUMA foto/vídeo encontrado na tabela para o espaço");
        
        // Se não há dados na tabela, usar apenas os arquivos do bucket
        if (bucketFiles.length > 0) {
          console.log("🔥 USANDO APENAS ARQUIVOS DO BUCKET:", bucketFiles);
          
          const bucketPhotos = bucketFiles.map(file => ({
            id: `bucket-${file.fileName}`,
            space_id: id,
            storage_path: file.storage_path,
            created_at: new Date().toISOString()
          }));
          
          setPhotos(bucketPhotos);
          await createPhotoUrls(bucketPhotos);
          
          toast.success(`${bucketFiles.length} arquivo(s) encontrado(s) diretamente no storage!`);
        }
      }
    } catch (error) {
      console.error("💥 ERRO GERAL ao buscar fotos:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    } finally {
      setLoading(false);
    }
  };

  // Nova função para buscar arquivos diretamente do bucket
  const fetchFromBucket = async (spaceId: string) => {
    const foundFiles: Array<{fileName: string, storage_path: string}> = [];
    
    try {
      console.log("🔍 BUSCANDO ARQUIVOS DIRETAMENTE NO BUCKET para espaço:", spaceId);
      
      // Buscar na pasta spaces (onde estão os arquivos reais)
      const { data: files, error } = await supabase.storage
        .from('spaces')
        .list('spaces', { limit: 1000 });
      
      if (!error && files && files.length > 0) {
        console.log(`📂 ARQUIVOS ENCONTRADOS na pasta 'spaces':`, files.length);
        
        // Filtrar arquivos de mídia (imagens e vídeos)
        const mediaFiles = files.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi'].includes(ext || '');
        });
        
        console.log(`🎬 ARQUIVOS DE MÍDIA encontrados:`, mediaFiles);
        
        mediaFiles.forEach(file => {
          const fullPath = `spaces/${file.name}`;
          const { data } = supabase.storage.from('spaces').getPublicUrl(fullPath);
          
          foundFiles.push({
            fileName: file.name,
            storage_path: data.publicUrl
          });
          
          console.log(`📁 ARQUIVO PROCESSADO:`, {
            name: file.name,
            fullPath,
            publicUrl: data.publicUrl
          });
        });
      }
      
      console.log("🔗 TOTAL DE ARQUIVOS ENCONTRADOS NO BUCKET:", foundFiles.length);
      return foundFiles;
      
    } catch (error) {
      console.error("❌ Erro ao buscar arquivos no bucket:", error);
      return [];
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
