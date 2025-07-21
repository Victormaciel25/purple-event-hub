
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
  const [imageSrc, setImageSrc] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;

  // Detectar se está no Android/Capacitor
  const isAndroidCapacitor = () => {
    return !!(window as any).Capacitor && 
           !!(window as any).Capacitor.getPlatform && 
           (window as any).Capacitor.getPlatform() === 'android';
  };

  // Função para limpar cache da imagem
  const clearImageCache = () => {
    if (isAndroidCapacitor()) {
      try {
        // Tentar limpar cache específico da imagem
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 1, 1);
        }
        
        // Forçar garbage collection se disponível
        if ((window as any).gc) {
          (window as any).gc();
        }
      } catch (e) {
        console.warn("Não foi possível limpar cache:", e);
      }
    }
  };

  // Função para preparar URL da imagem com cache busting
  const prepareImageUrl = (url: string, forceReload = false) => {
    if (!url || !url.trim()) return fallbackSrc;
    
    let finalUrl = url.trim();
    
    if (isAndroidCapacitor()) {
      // Para Android, sempre adicionar parâmetros únicos
      const separator = finalUrl.includes('?') ? '&' : '?';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      if (forceReload) {
        finalUrl = `${finalUrl}${separator}force=${timestamp}&r=${random}`;
      } else {
        finalUrl = `${finalUrl}${separator}t=${timestamp}`;
      }
    }
    
    return finalUrl;
  };

  // Reset e configuração inicial quando src muda
  useEffect(() => {
    console.log("🖼️ OPTIMIZED_IMG: Nova fonte detectada:", src);
    
    // Reset completo
    setLoading(true);
    setError(false);
    setRetryCount(0);
    setImageSrc("");
    
    // Limpar cache se Android
    clearImageCache();
    
    // Configurar nova imagem com delay
    const timer = setTimeout(() => {
      const newSrc = prepareImageUrl(src);
      console.log("🖼️ OPTIMIZED_IMG: Configurando nova fonte:", newSrc);
      setImageSrc(newSrc);
    }, isAndroidCapacitor() ? 100 : 50);

    return () => clearTimeout(timer);
  }, [src, fallbackSrc]);

  // Função para forçar reload da imagem
  const forceImageReload = () => {
    console.log("🔄 OPTIMIZED_IMG: Forçando reload da imagem");
    
    if (imgRef.current) {
      // Remover src temporariamente
      imgRef.current.src = "";
      imgRef.current.removeAttribute('src');
      
      // Limpar cache
      clearImageCache();
      
      // Re-adicionar src após delay
      setTimeout(() => {
        if (imgRef.current && imageSrc) {
          const reloadSrc = prepareImageUrl(imageSrc, true);
          console.log("🔄 OPTIMIZED_IMG: Definindo nova src:", reloadSrc);
          imgRef.current.src = reloadSrc;
        }
      }, 200);
    }
  };

  const handleLoad = () => {
    console.log("✅ OPTIMIZED_IMG: Imagem carregada com sucesso:", imageSrc);
    setLoading(false);
    setError(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("❌ OPTIMIZED_IMG: Erro ao carregar imagem:", imageSrc, e);
    
    if (retryCount < maxRetries && imageSrc !== fallbackSrc) {
      console.log(`🔄 OPTIMIZED_IMG: Tentativa ${retryCount + 1}/${maxRetries}`);
      setRetryCount(prev => prev + 1);
      
      // Delay progressivo para tentativas
      const retryDelay = isAndroidCapacitor() ? (1000 * (retryCount + 1)) : (500 * (retryCount + 1));
      
      setTimeout(() => {
        forceImageReload();
      }, retryDelay);
    } else {
      console.log("🔄 OPTIMIZED_IMG: Máximo de tentativas atingido, usando fallback");
      setError(true);
      setLoading(false);
      
      // Definir fallback como src
      if (imgRef.current && imageSrc !== fallbackSrc) {
        const fallbackUrl = prepareImageUrl(fallbackSrc);
        setImageSrc(fallbackUrl);
        imgRef.current.src = fallbackUrl;
      }
    }
  };

  // Se não tem src válido, mostrar placeholder
  if (!imageSrc) {
    return (
      <div className={`${className} ${loadingClassName} flex items-center justify-center bg-gray-100`}>
        <span className="text-gray-400 text-xs">Carregando...</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {loading && (
        <div className={`absolute inset-0 ${loadingClassName} flex items-center justify-center z-10`}>
          <span className="text-gray-400 text-xs">Carregando...</span>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="eager"
        decoding="sync"
        crossOrigin="anonymous"
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransform: 'translate3d(0,0,0)',
          transform: 'translate3d(0,0,0)',
          WebkitPerspective: '1000px',
          perspective: '1000px',
          imageRendering: 'auto',
        }}
        {...rest}
      />
      
      {/* Indicador de retry para debug */}
      {retryCount > 0 && !loading && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1 rounded z-20">
          R{retryCount}
        </div>
      )}
      
      {/* Indicador de erro */}
      {error && (
        <div className="absolute bottom-1 left-1 bg-red-500 text-white text-xs px-1 rounded z-20">
          Erro
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
