
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
  fallbackSrc = "https://source.unsplash.com/random/100x100?building",
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  useEffect(() => {
    // Reset states when src changes
    setLoaded(false);
    setError(false);
    
    if (!src) {
      setError(true);
      return;
    }
    
    // Set image source directly - we'll skip the cache checking as it might be causing issues with signed URLs
    setImgSrc(src);
    
    // Clean up function
    return () => {
      if (imgSrc && imgSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [src]);
  
  // Handle image load error
  const handleError = () => {
    console.error("Image failed to load:", src);
    setError(true);
    setLoaded(false);
  };
  
  return (
    <div className={`${className} overflow-hidden ${!loaded && !error ? loadingClassName : ''}`}>
      {imgSrc && !error ? (
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
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
