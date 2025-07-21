
import { useState, useEffect } from 'react';

export const usePlatform = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      // Verificar se é Capacitor
      const capacitorExists = !!(window as any).Capacitor;
      setIsCapacitor(capacitorExists);

      if (capacitorExists) {
        // Verificar se é Android
        const platform = (window as any).Capacitor?.getPlatform?.();
        setIsAndroid(platform === 'android');
      } else {
        setIsAndroid(false);
      }
    };

    checkPlatform();
  }, []);

  return { isAndroid, isCapacitor };
};
