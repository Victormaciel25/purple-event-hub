
import React, { useState, useEffect } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  loadingClassName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  loadingClassName = "animate-pulse bg-gray-200",
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if image is in cache
    caches.match(src).then(cachedResponse => {
      if (cachedResponse) {
        // Image is cached, use it immediately
        cachedResponse.blob().then(blob => {
          setImgSrc(URL.createObjectURL(blob));
          setLoaded(true);
        });
      } else {
        // Image not cached, load it normally
        setImgSrc(src);
      }
    });
    
    return () => {
      // Clean up object URL if created
      if (imgSrc && imgSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, [src]);
  
  return (
    <div className={`${className} overflow-hidden ${!loaded ? loadingClassName : ''}`}>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          {...rest}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
