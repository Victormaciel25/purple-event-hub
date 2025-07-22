
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
          // Para URLs existentes, usar diretamente com cache busting
          let finalUrl = url;
          if (isMobileCapacitor) {
            const separator = url.includes('?') ? '&' : '?';
            finalUrl = `${url}${separator}v=${Date.now()}&mobile=true`;
          }
          
          if (isMounted) {
            setPreviewUrl(finalUrl);
            setIsLoading(false);
          }
          return;
        }

        if (file) {
          console.log('🎨 PREVIEW_HOOK: Gerando preview para arquivo:', file.name);
          
          // Método alternativo: usar Canvas para gerar preview
          if (isMobileCapacitor) {
            console.log('📱 PREVIEW_HOOK: Usando método Canvas para mobile');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
              if (!isMounted) return;
              
              try {
                // Definir tamanho do canvas (preview pequeno para performance)
                const maxSize = 400;
                let { width, height } = img;
                
                if (width > height) {
                  if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                  }
                } else {
                  if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar imagem no canvas
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Converter para DataURL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                console.log('✅ PREVIEW_HOOK: Canvas preview gerado, tamanho:', dataUrl.length);
                
                setPreviewUrl(dataUrl);
                setIsLoading(false);
              } catch (error) {
                console.error('❌ PREVIEW_HOOK: Erro no Canvas:', error);
                setHasError(true);
                setIsLoading(false);
              }
            };
            
            img.onerror = () => {
              console.error('❌ PREVIEW_HOOK: Erro ao carregar imagem no Canvas');
              if (isMounted) {
                setHasError(true);
                setIsLoading(false);
              }
            };
            
            // Usar FileReader para obter dados da imagem
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result && isMounted) {
                img.src = e.target.result as string;
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
          } else {
            // Para web, usar método tradicional
            console.log('🌐 PREVIEW_HOOK: Usando createObjectURL para web');
            const objectUrl = URL.createObjectURL(file);
            
            if (isMounted) {
              setPreviewUrl(objectUrl);
              setIsLoading(false);
            }
            
            // Cleanup será feito no useEffect cleanup
            return () => {
              URL.revokeObjectURL(objectUrl);
            };
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
    };
  }, [file, url, isMobileCapacitor]);

  return {
    previewUrl,
    isLoading,
    hasError,
    isMobile: isMobileCapacitor
  };
};
