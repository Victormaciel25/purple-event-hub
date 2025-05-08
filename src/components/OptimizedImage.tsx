
import React, { useState } from "react";

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
  fallbackSrc = "https://source.unsplash.com/random/100x100?building",
  ...rest
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    console.error("Imagem falhou ao carregar:", src);
    setError(true);
    setLoading(false);
  };

  // Se a URL da imagem estiver vazia, usar fallback imediatamente
  if (!src) {
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
      {!error ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleLoad}
          onError={handleError}
          {...rest}
        />
      ) : (
        <img 
          src={fallbackSrc}
          alt={alt}
          className="w-full h-full object-cover"
          {...rest}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
