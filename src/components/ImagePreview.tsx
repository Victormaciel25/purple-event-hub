
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

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

  // Detectar se está no Android/Capacitor
  const isAndroidCapacitor = () => {
    return !!(window as any).Capacitor && 
           !!(window as any).Capacitor.getPlatform && 
           (window as any).Capacitor.getPlatform() === 'android';
  };

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      setLoading(true);
      setError(false);

      try {
        if (url) {
          // Para URLs já existentes (imagens já enviadas)
          const finalUrl = isAndroidCapacitor() 
            ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
            : url;
          setPreviewSrc(finalUrl);
        } else if (file) {
          // Para arquivos locais (preview antes do upload)
          if (isAndroidCapacitor()) {
            // No Android, usar FileReader para melhor compatibilidade
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                setPreviewSrc(result);
                setLoading(false);
              } else {
                setError(true);
                setLoading(false);
              }
            };
            reader.onerror = () => {
              setError(true);
              setLoading(false);
            };
            reader.readAsDataURL(file);
            return; // Não continuar com URL.createObjectURL
          } else {
            // Na web, usar URL.createObjectURL
            objectUrl = URL.createObjectURL(file);
            setPreviewSrc(objectUrl);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar preview:", err);
        setError(true);
        setLoading(false);
      }
    };

    loadPreview();

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, url]);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setError(true);
    setLoading(false);
  };

  return (
    <div className={`relative ${className} border border-gray-200 rounded-lg overflow-hidden bg-gray-50`}>
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-xs text-gray-500">Carregando...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-xs text-red-500">Erro ao carregar</div>
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
          loading="eager"
          decoding="sync"
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitTransform: 'translate3d(0,0,0)',
            transform: 'translate3d(0,0,0)',
          }}
        />
      )}

      {/* Upload overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Status indicator */}
      {!isUploading && file && !url && (
        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
          Aguardando
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors z-10"
        disabled={isUploading}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ImagePreview;
