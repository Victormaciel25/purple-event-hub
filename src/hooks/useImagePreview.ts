
import { useState, useEffect } from 'react';
import { usePlatform } from './usePlatform';

interface UseImagePreviewProps {
  file?: File;
  url?: string;
}

export const useImagePreview = ({ file, url }: UseImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { isMobileCapacitor } = usePlatform();

  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      setIsLoading(true);
      setHasError(false);
      setPreviewUrl('');

      try {
        if (url) {
          // Para URLs existentes, usar diretamente
          let finalUrl = url;
          if (isMobileCapacitor) {
            const separator = url.includes('?') ? '&' : '?';
            finalUrl = `${url}${separator}v=${Date.now()}&m=1`;
          }
          
          if (isMounted) {
            setPreviewUrl(finalUrl);
            setIsLoading(false);
          }
          return;
        }

        if (file) {
          console.log('🎨 PREVIEW_HOOK: Convertendo arquivo para Base64:', file.name);
          
          // Método simples: FileReader direto para Base64
          const reader = new FileReader();
          
          reader.onload = (event) => {
            if (!isMounted) return;
            
            const result = event.target?.result;
            if (typeof result === 'string') {
              console.log('✅ PREVIEW_HOOK: Base64 gerado com sucesso');
              setPreviewUrl(result);
              setIsLoading(false);
            } else {
              console.error('❌ PREVIEW_HOOK: Resultado não é string');
              setHasError(true);
              setIsLoading(false);
            }
          };
          
          reader.onerror = (error) => {
            console.error('❌ PREVIEW_HOOK: Erro no FileReader:', error);
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          };
          
          // Ler como Data URL (Base64)
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error('💥 PREVIEW_HOOK: Erro geral:', error);
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
  }, [file, url, isMobileCapacitor]);

  return {
    previewUrl,
    isLoading,
    hasError,
    isMobile: isMobileCapacitor
  };
};
