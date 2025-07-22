
import { useState, useEffect, useCallback } from 'react';
import { useCapacitorImageFile } from './useCapacitorImageFile';
import { detectPlatform } from '@/utils/platformDetection';

interface UseOptimizedImagePreviewProps {
  file?: File;
  url?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const useOptimizedImagePreview = ({ 
  file, 
  url, 
  maxWidth = 300, 
  maxHeight = 300, 
  quality = 0.8 
}: UseOptimizedImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const platform = detectPlatform();
  const { saveFileToTemp, cleanupTempFiles } = useCapacitorImageFile();

  const createBlobUrl = useCallback((imageFile: File): string => {
    console.log('🔗 BLOB_URL: Criando blob URL para:', imageFile.name);
    return URL.createObjectURL(imageFile);
  }, []);

  const createCanvasPreview = useCallback((imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('🎨 CANVAS_PREVIEW: Criando preview otimizado para:', imageFile.name);
      
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          // Calcular dimensões mantendo proporção
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para data URL com qualidade otimizada
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log('✅ CANVAS_PREVIEW: Preview criado com sucesso');
          resolve(dataUrl);
        } catch (error) {
          console.error('❌ CANVAS_PREVIEW: Erro ao processar:', error);
          reject(error);
        }
      };

      img.onerror = () => {
        console.error('❌ CANVAS_PREVIEW: Erro ao carregar imagem');
        reject(new Error('Failed to load image'));
      };

      // Usar FileReader para carregar a imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(imageFile);
    });
  }, [maxWidth, maxHeight, quality]);

  const createFileReaderUrl = useCallback((imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('📖 FILEREADER: Processando:', imageFile.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          console.log('✅ FILEREADER: Concluído');
          resolve(result);
        } else {
          reject(new Error('FileReader result is not a string'));
        }
      };
      reader.onerror = () => {
        console.error('❌ FILEREADER: Erro');
        reject(new Error('FileReader failed'));
      };
      reader.readAsDataURL(imageFile);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    
    const generatePreview = async () => {
      console.log('🚀 OPTIMIZED_PREVIEW: Iniciando:', { 
        hasFile: !!file, 
        hasUrl: !!url, 
        isAndroid: platform.isAndroid,
        isCapacitor: platform.isCapacitor
      });
      
      setIsLoading(true);
      setHasError(false);
      setPreviewUrl('');

      try {
        // Para URLs existentes, usar diretamente
        if (url) {
          console.log('📎 OPTIMIZED_PREVIEW: Usando URL existente');
          if (isMounted) {
            setPreviewUrl(url);
            setIsLoading(false);
          }
          return;
        }

        // Para arquivos locais
        if (file) {
          // Validar formato de arquivo
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            console.warn('⚠️ OPTIMIZED_PREVIEW: Formato de imagem não suportado:', file.type);
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
            return;
          }

          console.log('📁 OPTIMIZED_PREVIEW: Processando arquivo local');
          
          // Estratégia 1: Capacitor Filesystem (para Android Capacitor)
          if (platform.isCapacitor && platform.isAndroid) {
            console.log('📱 OPTIMIZED_PREVIEW: Usando Capacitor Filesystem para Android');
            try {
              const tempFileUri = await saveFileToTemp(file);
              if (tempFileUri && isMounted) {
                setPreviewUrl(tempFileUri);
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.warn('⚠️ OPTIMIZED_PREVIEW: Capacitor Filesystem falhou, tentando blob URL');
            }
          }

          // Estratégia 2: Blob URL (para Android web ou fallback)
          if (platform.isAndroid) {
            console.log('🤖 OPTIMIZED_PREVIEW: Android detectado, usando Blob URL');
            try {
              objectUrl = createBlobUrl(file);
              if (isMounted) {
                setPreviewUrl(objectUrl);
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.warn('⚠️ OPTIMIZED_PREVIEW: Blob URL falhou no Android, tentando canvas');
            }
          }

          // Estratégia 3: Canvas (para outras plataformas ou fallback)
          try {
            const canvasUrl = await createCanvasPreview(file);
            if (isMounted) {
              setPreviewUrl(canvasUrl);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.warn('⚠️ OPTIMIZED_PREVIEW: Canvas falhou, tentando blob URL');
          }

          // Estratégia 4: Blob URL (fallback geral)
          try {
            objectUrl = createBlobUrl(file);
            if (isMounted) {
              setPreviewUrl(objectUrl);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.warn('⚠️ OPTIMIZED_PREVIEW: Blob URL falhou, tentando FileReader');
          }

          // Estratégia 5: FileReader (último recurso)
          try {
            const fileReaderUrl = await createFileReaderUrl(file);
            if (isMounted) {
              setPreviewUrl(fileReaderUrl);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('❌ OPTIMIZED_PREVIEW: Todas as estratégias falharam');
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          }
        }

        // Se não tem file nem url
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('💥 OPTIMIZED_PREVIEW: Erro geral:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      // Limpar arquivos temporários quando o componente for desmontado
      cleanupTempFiles();
    };
  }, [file, url, platform, saveFileToTemp, cleanupTempFiles, createCanvasPreview, createBlobUrl, createFileReaderUrl]);

  return {
    previewUrl,
    isLoading,
    hasError
  };
};
