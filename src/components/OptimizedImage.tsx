
import React, { useState, useEffect, useRef } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  loadingClassName?: string;
  fallbackSrc?: string;
  eager?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  loadingClassName = "animate-pulse bg-gray-200",
  fallbackSrc = "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop",
  eager = true,
  ...rest
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 2; // Reduzir tentativas

  // Função para detectar se está no ambiente Android/Capacitor
  const isAndroidCapacitor = () => {
    return !!(window as any).Capacitor && 
           !!(window as any).Capacitor.getPlatform && 
           (window as any).Capacitor.getPlatform() === 'android';
  };

  // Reset quando src muda
  useEffect(() => {
    console.log("🖼️ OPTIMIZED_IMG: Source changed:", src);
    
    setLoading(true);
    setError(false);
    setRetryCount(0);
    
    if (src && src.trim()) {
      // Para Android, adicionar timestamp apenas se necessário
      const finalSrc = isAndroidCapacitor() && retryCount > 0 && !src.includes('?') 
        ? `${src}?t=${Date.now()}`
        : src;
      
      console.log("🖼️ OPTIMIZED_IMG: Setting source:", finalSrc);
      setCurrentSrc(finalSrc);
    } else {
      console.warn("🖼️ OPTIMIZED_IMG: Empty src, using fallback");
      setCurrentSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleLoad = () => {
    console.log("✅ OPTIMIZED_IMG: Image loaded successfully:", currentSrc);
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    console.error("❌ OPTIMIZED_IMG: Image failed to load:", currentSrc);
    
    if (retryCount < maxRetries) {
      console.log(`🔄 OPTIMIZED_IMG: Retrying... (${retryCount + 1}/${maxRetries})`);
      setRetryCount(prev => prev + 1);
      
      // Tentar novamente com delay menor
      setTimeout(() => {
        const retrySrc = currentSrc.includes('?') 
          ? `${currentSrc}&retry=${Date.now()}`
          : `${currentSrc}?retry=${Date.now()}`;
        setCurrentSrc(retrySrc);
      }, 500);
    } else {
      console.log("🔄 OPTIMIZED_IMG: Max retries reached, using fallback");
      setError(true);
      setLoading(false);
      setCurrentSrc(fallbackSrc);
    }
  };

  // Se não tem src válido, mostrar fallback
  if (!currentSrc) {
    return (
      <div className={`${className} ${loadingClassName}`}>
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-xs">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {loading && (
        <div className={`absolute inset-0 ${loadingClassName} flex items-center justify-center`}>
          <span className="text-gray-400 text-xs">Carregando...</span>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        crossOrigin="anonymous"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        }}
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
