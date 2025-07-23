
import { useState, useEffect } from 'react';

interface UseOptimizedImagePreviewProps {
  file?: File;
  url?: string;
}

export const useOptimizedImagePreview = ({ 
  file, 
  url
}: UseOptimizedImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    
    const generatePreview = async () => {
      console.log('🚀 PREVIEW: Iniciando:', { hasFile: !!file, hasUrl: !!url });
      
      setIsLoading(true);
      setHasError(false);
      setPreviewUrl('');

      try {
        // Para URLs existentes, usar diretamente
        if (url) {
          console.log('📎 PREVIEW: Usando URL existente');
          if (isMounted) {
            setPreviewUrl(url);
            setIsLoading(false);
          }
          return;
        }

        // Para arquivos locais
        if (file) {
          console.log('📁 PREVIEW: Processando arquivo local:', file.name);
          
          // Primeira opção: Blob URL (melhor para Capacitor Android)
          try {
            objectUrl = URL.createObjectURL(file);
            console.log('✅ PREVIEW: Blob URL criada');
            
            if (isMounted) {
              setPreviewUrl(objectUrl);
              setIsLoading(false);
            }
            return;
          } catch (blobError) {
            console.warn('⚠️ PREVIEW: Erro no Blob URL, tentando FileReader:', blobError);
            
            // Fallback: FileReader
            const reader = new FileReader();
            
            reader.onload = (event) => {
              const result = event.target?.result;
              if (typeof result === 'string' && isMounted) {
                console.log('✅ PREVIEW: FileReader concluído');
                setPreviewUrl(result);
                setIsLoading(false);
              }
            };
            
            reader.onerror = () => {
              console.error('❌ PREVIEW: Erro no FileReader');
              if (isMounted) {
                setHasError(true);
                setIsLoading(false);
              }
            };
            
            reader.readAsDataURL(file);
          }
          return;
        }

        // Se não tem file nem url
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('💥 PREVIEW: Erro geral:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    // Cleanup
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
