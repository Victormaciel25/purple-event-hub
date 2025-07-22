
import { useState, useEffect } from 'react';

interface UseImagePreviewProps {
  file?: File;
  url?: string;
}

export const useImagePreview = ({ file, url }: UseImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    
    const generatePreview = async () => {
      console.log('🎨 PREVIEW_HOOK: Iniciando preview:', { hasFile: !!file, hasUrl: !!url });
      
      setIsLoading(true);
      setHasError(false);
      setPreviewUrl('');

      try {
        // Para URLs existentes, usar diretamente
        if (url) {
          console.log('📎 PREVIEW_HOOK: Usando URL existente');
          if (isMounted) {
            setPreviewUrl(url);
            setIsLoading(false);
          }
          return;
        }

        // Para arquivos locais, usar FileReader sempre
        if (file) {
          console.log('📁 PREVIEW_HOOK: Processando arquivo local:', file.name);
          
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string' && isMounted) {
              console.log('✅ PREVIEW_HOOK: FileReader concluído');
              setPreviewUrl(result);
              setIsLoading(false);
            }
          };
          
          reader.onerror = () => {
            console.error('❌ PREVIEW_HOOK: Erro no FileReader');
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          };
          
          reader.readAsDataURL(file);
          return;
        }

        // Se não tem file nem url, marcar como erro
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, url]);

  return {
    previewUrl,
    isLoading,
    hasError
  };
};
