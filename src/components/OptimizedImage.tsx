
import React, { useState, useEffect } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  loadingClassName?: string;
  fallbackSrc?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  loadingClassName = "animate-pulse bg-gray-200",
  fallbackSrc = "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop",
  ...rest
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  // Reset states when src changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setImgSrc(src);
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    console.error("Imagem falhou ao carregar:", src);
    setError(true);
    setLoading(false);
  };

  // Se a URL da imagem estiver vazia ou houve erro, usar fallback imediatamente
  if (!imgSrc || error) {
    return (
      <div className={className}>
        <img 
          src={fallbackSrc}
          alt={alt}
          className="w-full h-full object-cover"
          {...rest}
        />
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden ${loading ? loadingClassName : ''}`}>
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
