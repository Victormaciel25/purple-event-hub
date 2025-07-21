
import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

interface ImagePreviewProps {
  file?: File;
  url?: string;
  alt: string;
  onRemove: () => void;
  isUploading?: boolean;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  url,
  alt,
  onRemove,
  isUploading = false,
  className = "aspect-square"
}) => {
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { isAndroid, isMobileCapacitor } = usePlatform();
  const fileReaderRef = useRef<FileReader | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(false);

      try {
        if (url) {
          // Para URLs já existentes (imagens já enviadas)
          let finalUrl = url;
          
          // Forçar reload com timestamp em ambientes móveis
          if (isMobileCapacitor) {
            const separator = url.includes('?') ? '&' : '?';
            finalUrl = `${url}${separator}t=${Date.now()}&mobile=1&rnd=${Math.random().toString(36).substr(2, 9)}`;
          }
          
          if (isMounted) {
            setPreviewSrc(finalUrl);
            setLoading(false);
          }
        } else if (file) {
          // Para arquivos locais (preview antes do upload)
          console.log(`🔍 PREVIEW: Carregando preview para ${file.name} - Mobile: ${isMobileCapacitor}, Android: ${isAndroid}`);
          
          // Usar FileReader em todos os ambientes móveis (Android e iOS)
          if (isMobileCapacitor) {
            console.log('📱 PREVIEW: Usando FileReader para ambiente móvel');
            
            const reader = new FileReader();
            fileReaderRef.current = reader;
            
            reader.onload = (e) => {
              if (isMounted && e.target?.result) {
                const result = e.target.result as string;
                console.log('✅ PREVIEW: FileReader concluído, tamanho:', result.length);
                setPreviewSrc(result);
                setLoading(false);
              }
            };
            
            reader.onerror = (error) => {
              console.error('❌ PREVIEW: Erro no FileReader:', error);
              if (isMounted) {
                setError(true);
                setLoading(false);
              }
            };
            
            try {
              reader.readAsDataURL(file);
            } catch (error) {
              console.error('❌ PREVIEW: Erro ao iniciar FileReader:', error);
              if (isMounted) {
                setError(true);
                setLoading(false);
              }
            }
          } else {
            // Na web desktop, usar URL.createObjectURL
            console.log('🌐 PREVIEW: Usando createObjectURL para web');
            try {
              const objectUrl = URL.createObjectURL(file);
              objectUrlRef.current = objectUrl;
              
              if (isMounted) {
                setPreviewSrc(objectUrl);
                setLoading(false);
              }
            } catch (err) {
              console.error("❌ PREVIEW: Erro ao criar object URL:", err);
              if (isMounted) {
                setError(true);
                setLoading(false);
              }
            }
          }
        } else {
          if (isMounted) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("💥 PREVIEW: Erro geral ao carregar preview:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadPreview();

    // Cleanup
    return () => {
      isMounted = false;
      
      // Cleanup FileReader
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
        fileReaderRef.current = null;
      }
      
      // Cleanup object URL (apenas se não for móvel)
      if (objectUrlRef.current && !isMobileCapacitor) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file, url, isMobileCapacitor, isAndroid]);

  const handleImageLoad = () => {
    console.log('✅ PREVIEW: Imagem carregada com sucesso');
    setLoading(false);
    setError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("❌ PREVIEW: Erro ao carregar imagem:", e);
    setError(true);
    setLoading(false);
  };

  return (
    <div className={`relative ${className} border border-gray-200 rounded-lg overflow-hidden bg-gray-50`}>
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-iparty border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-gray-500">Carregando...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="text-red-500">⚠️</div>
            <div className="text-xs text-red-500 text-center">Erro ao carregar</div>
            {isMobileCapacitor && (
              <div className="text-xs text-blue-500 text-center">Modo móvel</div>
            )}
          </div>
        </div>
      )}

      {/* Image */}
      {previewSrc && (
        <img
          src={previewSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            // Otimizações para renderização móvel
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitTransform: 'translate3d(0,0,0)',
            transform: 'translate3d(0,0,0)',
            // Propriedades específicas para mobile
            ...(isMobileCapacitor ? {
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              imageRendering: 'auto',
              WebkitImageOrientation: 'from-image'
            } : {})
          }}
          crossOrigin="anonymous"
          loading="eager"
          decoding="async"
        />
      )}

      {/* Upload overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-white">Enviando...</div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {!isUploading && file && !url && (
        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded z-15">
          Aguardando
        </div>
      )}

      {/* Mobile indicator */}
      {isMobileCapacitor && !isUploading && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-15">
          📱
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors z-30"
        disabled={isUploading}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ImagePreview;
