
import React, { useState, useEffect, useRef } from "react";

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
  const [imgSrc, setImgSrc] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 2;

  // Reset states quando src muda
  useEffect(() => {
    console.log("🖼️ OPTIMIZED_IMG: Source changed:", src);
    setLoading(true);
    setError(false);
    setRetryCount(0);
    
    // Limpar src atual para forçar reload
    setImgSrc("");
    
    // Definir nova src após um pequeno delay para garantir reset
    const timer = setTimeout(() => {
      if (src && src.trim()) {
        setImgSrc(src);
      } else {
        console.warn("🖼️ OPTIMIZED_IMG: Empty or invalid src, using fallback");
        setImgSrc(fallbackSrc);
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [src, fallbackSrc]);

  const handleLoad = () => {
    console.log("✅ OPTIMIZED_IMG: Image loaded successfully:", imgSrc);
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    console.error("❌ OPTIMIZED_IMG: Image failed to load:", imgSrc);
    
    if (retryCount < maxRetries && imgSrc !== fallbackSrc) {
      console.log(`🔄 OPTIMIZED_IMG: Retrying... (${retryCount + 1}/${maxRetries})`);
      setRetryCount(prev => prev + 1);
      
      // Tentar novamente após um delay
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = imgSrc + `?retry=${retryCount + 1}&t=${Date.now()}`;
        }
      }, 1000);
    } else {
      console.log("🔄 OPTIMIZED_IMG: Max retries reached, using fallback");
      setError(true);
      setLoading(false);
      setImgSrc(fallbackSrc);
    }
  };

  // Se não tem src válido ou houve erro final, usar fallback
  if (!imgSrc || (error && imgSrc === fallbackSrc)) {
    return (
      <div className={className}>
        <img 
          src={fallbackSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={() => setLoading(false)}
          {...rest}
        />
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden ${loading ? loadingClassName : ''}`}>
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        // Adicionar propriedades para melhor compatibilidade Android
        loading="lazy"
        decoding="async"
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
