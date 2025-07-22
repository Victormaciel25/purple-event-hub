
import React from "react";
import { X } from "lucide-react";
import { useImagePreview } from "@/hooks/useImagePreview";

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
  const { previewUrl, isLoading, hasError } = useImagePreview({ file, url });

  console.log('🖼️ PREVIEW: Estado:', { 
    hasPreviewUrl: !!previewUrl,
    isLoading,
    hasError,
    isUploading
  });

  return (
    <div className={`relative ${className} border border-gray-200 rounded-lg overflow-hidden bg-gray-50`}>
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-iparty border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-gray-500">Carregando...</div>
          </div>
        </div>
      )}

      {/* Error */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="text-red-500 text-2xl">⚠️</div>
            <div className="text-xs text-red-500 text-center px-2">
              Erro ao carregar
            </div>
          </div>
        </div>
      )}

      {/* Imagem */}
      {previewUrl && !hasError && (
        <img
          src={previewUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => console.log('✅ PREVIEW: Imagem carregada')}
          onError={() => console.error('❌ PREVIEW: Erro na imagem')}
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

      {/* Status badge para arquivos locais */}
      {file && !url && !isUploading && (
        <div className="absolute top-2 left-2 z-15">
          <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
            Local
          </div>
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
