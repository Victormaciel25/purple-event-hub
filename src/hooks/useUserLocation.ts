
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

// SINGLETON GLOBAL SIMPLIFICADO
let globalLocation: UserLocation | null = null;
let locationPromise: Promise<UserLocation | null> | null = null;
let lastLocationTime: number = 0;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
let debounceTimer: NodeJS.Timeout | null = null;

export const useUserLocation = () => {
  const [state, setState] = useState<LocationState>({
    location: globalLocation,
    loading: !globalLocation,
    error: null
  });

  const getUserLocation = useCallback(async (): Promise<UserLocation | null> => {
    const now = Date.now();
    
    // Cache válido
    if (globalLocation && now - lastLocationTime < LOCATION_CACHE_DURATION) {
      console.log('🎯 LOCATION: Using valid cache');
      return globalLocation;
    }

    // Requisição já em andamento
    if (locationPromise) {
      console.log('⏳ LOCATION: Waiting for existing request');
      return locationPromise;
    }

    console.log('📍 LOCATION: Starting fresh location request...');
    const startTime = performance.now();
    
    locationPromise = (async () => {
      try {
        // Timeout mais agressivo - apenas 2 segundos
        const position = await Promise.race([
          Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Mais rápido
            timeout: 2000, // 2 segundos apenas
            maximumAge: 300000 // 5 minutos
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 2000)
          )
        ]);

        const location = {
          latitude: (position as any).coords.latitude,
          longitude: (position as any).coords.longitude
        };
        
        const endTime = performance.now();
        console.log(`✅ LOCATION: Obtained in ${(endTime - startTime).toFixed(0)}ms`);
        
        globalLocation = location;
        lastLocationTime = now;
        return location;
      } catch (error) {
        console.warn('❌ LOCATION: Capacitor failed, trying browser fallback');
        
        // Fallback browser rápido
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                console.log('✅ LOCATION: Browser location obtained');
                globalLocation = location;
                lastLocationTime = Date.now();
                resolve(location);
              },
              () => {
                console.warn('⚠️ LOCATION: All methods failed');
                resolve(null);
              },
              {
                enableHighAccuracy: false,
                timeout: 2000,
                maximumAge: 300000
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
    // Debounce simples
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      // Cache válido - usar imediatamente
      if (globalLocation && Date.now() - lastLocationTime < LOCATION_CACHE_DURATION) {
        setState({
          location: globalLocation,
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
          error: location ? null : 'Localização não disponível'
        });
      } catch (error) {
        console.error('💥 LOCATION: Error:', error);
        setState({
          location: null,
          loading: false,
          error: 'Erro ao obter localização'
        });
      }
    }, 50); // Debounce mínimo
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
