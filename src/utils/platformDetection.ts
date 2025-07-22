
// Utilitário para detectar plataforma de forma mais robusta
export const detectPlatform = () => {
  try {
    // Primeira tentativa: Capacitor
    if ((window as any).Capacitor) {
      const platform = (window as any).Capacitor.getPlatform?.();
      console.log('🔍 PLATFORM: Capacitor detectado:', platform);
      return {
        isCapacitor: true,
        platform: platform || 'unknown',
        isAndroid: platform === 'android',
        isIOS: platform === 'ios',
        isMobile: platform === 'android' || platform === 'ios'
      };
    }
    
    // Segunda tentativa: User Agent
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isMobile = isAndroid || isIOS;
    
    console.log('🔍 PLATFORM: User Agent:', { isAndroid, isIOS, isMobile });
    
    return {
      isCapacitor: false,
      platform: isAndroid ? 'android' : isIOS ? 'ios' : 'web',
      isAndroid,
      isIOS,
      isMobile
    };
  } catch (error) {
    console.error('❌ PLATFORM: Erro na detecção:', error);
    return {
      isCapacitor: false,
      platform: 'web',
      isAndroid: false,
      isIOS: false,
      isMobile: false
    };
  }
};
