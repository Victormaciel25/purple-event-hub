
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      console.log('🚀 SIMPLE_PREVIEW: Iniciando:', { 
        hasFile: !!file, 
        hasUrl: !!url, 
        platform: platform.platform
      });
      
      setIsLoading(true);
      setHasError(false);
      setPreviewUrl('');

      try {
        // Para URLs existentes, usar diretamente
        if (url) {
          console.log('📎 SIMPLE_PREVIEW: Usando URL existente');
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
            console.warn('⚠️ SIMPLE_PREVIEW: Formato não suportado:', file.type);
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
            return;
          }

          console.log('📁 SIMPLE_PREVIEW: Processando arquivo local com FileReader');
          
          // Usar sempre FileReader - método mais simples e compatível
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string' && isMounted) {
              console.log('✅ SIMPLE_PREVIEW: FileReader concluído');
              setPreviewUrl(result);
              setIsLoading(false);
            }
          };
          
          reader.onerror = () => {
            console.error('❌ SIMPLE_PREVIEW: Erro no FileReader');
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          };
          
          reader.readAsDataURL(file);
          return;
        }

        // Se não tem file nem url
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('💥 SIMPLE_PREVIEW: Erro geral:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [file, url, platform.platform]);

  return {
    previewUrl,
    isLoading,
    hasError
  };
};
