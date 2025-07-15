
import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

type UserLocation = {
  latitude: number;
  longitude: number;
};

type LocationState = {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
};

// Cache global SINGLETON para localização
let cachedLocation: UserLocation | null = null;
let locationPromise: Promise<UserLocation | null> | null = null;
let lastLocationTime: number = 0;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Debounce para evitar múltiplas chamadas simultâneas
let debounceTimer: NodeJS.Timeout | null = null;

export const useUserLocation = () => {
  const [state, setState] = useState<LocationState>({
    location: cachedLocation,
    loading: !cachedLocation && Date.now() - lastLocationTime > LOCATION_CACHE_DURATION,
    error: null
  });

  const getUserLocation = useCallback(async (): Promise<UserLocation | null> => {
    const now = Date.now();
    
    // Se temos cache válido, retornar imediatamente
    if (cachedLocation && now - lastLocationTime < LOCATION_CACHE_DURATION) {
      console.log('🎯 LOCATION: Using valid cache');
      return cachedLocation;
    }

    // Se já existe uma promise em andamento, aguardar ela
    if (locationPromise) {
      console.log('⏳ LOCATION: Waiting for existing promise');
      return locationPromise;
    }

    // Criar nova promise para obter localização
    locationPromise = (async () => {
      try {
        console.log('🔍 LOCATION: Starting fresh location request...');
        const startTime = performance.now();
        
        // Timeout reduzido para 3 segundos
        const position = await Promise.race([
          Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Mudado para false para ser mais rápido
            timeout: 3000, // Reduzido de 5000 para 3000
            maximumAge: 60000 // 1 minuto
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 3000)
          )
        ]);

        const location = {
          latitude: (position as any).coords.latitude,
          longitude: (position as any).coords.longitude
        };
        
        const endTime = performance.now();
        console.log(`✅ LOCATION: Obtained in ${(endTime - startTime).toFixed(0)}ms:`, location);
        
        cachedLocation = location;
        lastLocationTime = now;
        return location;
      } catch (error) {
        console.warn('❌ LOCATION: Capacitor failed, trying browser fallback:', error);
        
        // Fallback para web/navegador com timeout reduzido
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          console.log('🔄 LOCATION: Using browser geolocation...');
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                console.log('✅ LOCATION: Browser location obtained:', location);
                cachedLocation = location;
                lastLocationTime = Date.now();
                resolve(location);
              },
              (error) => {
                console.warn('⚠️ LOCATION: Browser geolocation failed:', error);
                resolve(null);
              },
              {
                enableHighAccuracy: false,
                timeout: 3000,
                maximumAge: 60000
              }
            );
          });
        }
        
        return null;
      } finally {
        locationPromise = null;
      }
    })();

    return locationPromise;
  }, []);

  const fetchLocation = useCallback(async () => {
    // Debounce para evitar múltiplas chamadas
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      // Se temos cache válido, usar imediatamente
      if (cachedLocation && Date.now() - lastLocationTime < LOCATION_CACHE_DURATION) {
        setState({
          location: cachedLocation,
          loading: false,
          error: null
        });
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const location = await getUserLocation();
        setState({
          location,
          loading: false,
          error: location ? null : 'Não foi possível obter sua localização'
        });
      } catch (error) {
        console.error('💥 LOCATION: Error fetching location:', error);
        setState({
          location: null,
          loading: false,
          error: 'Erro ao obter localização'
        });
      }
    }, 100); // Debounce de 100ms
  }, [getUserLocation]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location: state.location,
    loading: state.loading,
    error: state.error,
    refetch: fetchLocation,
    getUserLocation
  };
};
