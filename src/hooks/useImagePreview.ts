
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

        // Para arquivos locais, usar FileReader primeiro (mais compatível)
        if (file) {
          console.log('📁 PREVIEW_HOOK: Processando arquivo local:', file.name, 'Tamanho:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
          
          // Método 1: FileReader (mais compatível com Capacitor)
          const reader = new FileReader();
          
          const readPromise = new Promise<string>((resolve, reject) => {
            reader.onload = (event) => {
              const result = event.target?.result;
              if (typeof result === 'string') {
                console.log('✅ PREVIEW_HOOK: FileReader concluído com sucesso');
                resolve(result);
              } else {
                reject(new Error('FileReader result is not a string'));
              }
            };
            
            reader.onerror = () => {
              console.error('❌ PREVIEW_HOOK: Erro no FileReader');
              reject(new Error('FileReader failed'));
            };
            
            reader.readAsDataURL(file);
          });

          try {
            const base64Result = await readPromise;
            if (isMounted) {
              setPreviewUrl(base64Result);
              setIsLoading(false);
            }
            return;
          } catch (fileReaderError) {
            console.warn('⚠️ PREVIEW_HOOK: FileReader falhou, tentando createObjectURL como fallback');
            
            // Método 2: createObjectURL (fallback)
            try {
              objectUrl = URL.createObjectURL(file);
              console.log('✅ PREVIEW_HOOK: createObjectURL como fallback funcionou');
              
              if (isMounted) {
                setPreviewUrl(objectUrl);
                setIsLoading(false);
              }
              return;
            } catch (objectUrlError) {
              console.error('❌ PREVIEW_HOOK: Ambos os métodos falharam:', { fileReaderError, objectUrlError });
              throw objectUrlError;
            }
          }
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
