
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.968628b97924463195ef75ff4425d21a',
  appName: 'purple-event-hub',
  webDir: 'dist',
  server: {
    url: 'https://968628b9-7924-4631-95ef-75ff4425d21a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FF385C',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;
