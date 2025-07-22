
import { useState, useEffect } from 'react';
import { detectPlatform } from '@/utils/platformDetection';

export const usePlatform = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isMobileCapacitor, setIsMobileCapacitor] = useState(false);

  useEffect(() => {
    const updatePlatform = () => {
      const platform = detectPlatform();
      
      setIsAndroid(platform.isAndroid);
      setIsCapacitor(platform.isCapacitor);
      setIsMobileCapacitor(platform.isMobile);
      
      console.log('📱 PLATFORM_HOOK: Estado atualizado:', {
        isAndroid: platform.isAndroid,
        isCapacitor: platform.isCapacitor,
        isMobileCapacitor: platform.isMobile,
        platform: platform.platform
      });
    };

    // Atualizar imediatamente
    updatePlatform();
    
    // Verificar novamente após delay para garantir que Capacitor carregou
    const timer = setTimeout(updatePlatform, 200);
    
    return () => clearTimeout(timer);
  }, []);

  return { isAndroid, isCapacitor, isMobileCapacitor };
};
