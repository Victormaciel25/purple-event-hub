
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'VM.iparty',
  appName: 'iParty',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'kfqorqjwbkxzrqhuvnyh.supabase.co',
      '*.supabase.co',
      'maps.googleapis.com',
      '*.googleapis.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FF385C',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    Geolocation: {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    // Configurações específicas para melhorar compatibilidade com imagens
    appendUserAgent: 'iPartyApp',
    overrideUserAgent: undefined,
    backgroundColor: '#ffffff',
    // Configurações de WebView para suporte a data URLs
    webViewPrefs: {
      allowFileAccess: true,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true,
      mixedContentMode: 'always_allow',
      allowsContentAccess: true
    }
  }
};

export default config;
