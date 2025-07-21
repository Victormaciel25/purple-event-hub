
import { useState, useEffect } from 'react';

export const usePlatform = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isMobileCapacitor, setIsMobileCapacitor] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      try {
        // Verificar se é Capacitor
        const capacitorExists = !!(window as any).Capacitor;
        setIsCapacitor(capacitorExists);

        if (capacitorExists) {
          // Verificar plataforma específica
          const platform = (window as any).Capacitor?.getPlatform?.();
          const isAndroidPlatform = platform === 'android';
          const isMobilePlatform = platform === 'android' || platform === 'ios';
          
          setIsAndroid(isAndroidPlatform);
          setIsMobileCapacitor(isMobilePlatform);
        } else {
          // Fallback: verificar user agent para detectar mobile
          const userAgent = navigator.userAgent;
          const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
          
          setIsAndroid(/Android/i.test(userAgent));
          setIsMobileCapacitor(isMobileUserAgent);
        }
      } catch (error) {
        console.warn('Erro ao detectar plataforma:', error);
        // Fallback para user agent
        const userAgent = navigator.userAgent;
        setIsAndroid(/Android/i.test(userAgent));
        setIsMobileCapacitor(/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent));
        setIsCapacitor(false);
      }
    };

    checkPlatform();
    
    // Recheck após um pequeno delay para garantir que o Capacitor esteja carregado
    const timer = setTimeout(checkPlatform, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return { isAndroid, isCapacitor, isMobileCapacitor };
};
