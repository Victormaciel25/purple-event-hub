
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
  const [currentSrc, setCurrentSrc] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;

  // Função para detectar se está no ambiente Android/Capacitor
  const isAndroidCapacitor = () => {
    return !!(window as any).Capacitor && 
           !!(window as any).Capacitor.getPlatform && 
           (window as any).Capacitor.getPlatform() === 'android';
  };

  // Reset completo quando src muda
  useEffect(() => {
    console.log("🖼️ OPTIMIZED_IMG: Source changed:", src);
    
    // Reset completo do estado
    setLoading(true);
    setError(false);
    setRetryCount(0);
    setCurrentSrc("");
    
    // Para Android, adicionar delay antes de definir a nova src
    const delay = isAndroidCapacitor() ? 50 : 10;
    
    const timer = setTimeout(() => {
      if (src && src.trim()) {
        // Para Android, forçar reload adicionando timestamp
        const finalSrc = isAndroidCapacitor() && !src.includes('?') 
          ? `${src}?t=${Date.now()}`
          : src;
        
        console.log("🖼️ OPTIMIZED_IMG: Setting source:", finalSrc);
        setCurrentSrc(finalSrc);
      } else {
        console.warn("🖼️ OPTIMIZED_IMG: Empty src, using fallback");
        setCurrentSrc(fallbackSrc);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [src, fallbackSrc]);

  // Função para forçar reload da imagem
  const forceReload = () => {
    if (imgRef.current && currentSrc) {
      console.log("🔄 OPTIMIZED_IMG: Forcing image reload");
      
      // Remover src temporariamente
      imgRef.current.src = "";
      
      // Re-adicionar src após um breve delay
      setTimeout(() => {
        if (imgRef.current) {
          const reloadSrc = currentSrc.includes('?') 
            ? `${currentSrc}&reload=${Date.now()}`
            : `${currentSrc}?reload=${Date.now()}`;
          
          imgRef.current.src = reloadSrc;
        }
      }, 100);
    }
  };

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
      
      // Delay maior para Android
      const retryDelay = isAndroidCapacitor() ? 2000 : 1000;
      
      setTimeout(() => {
        forceReload();
      }, retryDelay);
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
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        style={{
          // Forçar re-renderização no Android
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        }}
        {...rest}
      />
      
      {/* Indicador de retry para debug */}
      {retryCount > 0 && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1 rounded">
          {retryCount}
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
