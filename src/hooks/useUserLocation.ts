
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

// SINGLETON GLOBAL MELHORADO
let globalLocation: UserLocation | null = null;
let locationPromise: Promise<UserLocation | null> | null = null;
let lastLocationTime: number = 0;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
let debounceTimer: NodeJS.Timeout | null = null;

// Helper para validar coordenadas
const isValidLocation = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180 &&
    !(lat === 0 && lng === 0) // Evitar coordenadas 0,0
  );
};

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
      console.log('🎯 LOCATION: Using valid cache', globalLocation);
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
        console.log('🎯 LOCATION: Trying Capacitor with high accuracy first...');
        
        // ESTRATÉGIA 1: Tentar alta precisão primeiro
        let position;
        try {
          position = await Promise.race([
            Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 10000
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('High accuracy timeout')), 5000)
            )
          ]);
        } catch (highAccuracyError) {
          console.log('⚠️ LOCATION: High accuracy failed, trying low accuracy...', highAccuracyError);
          
          // ESTRATÉGIA 2: Fallback para baixa precisão
          position = await Promise.race([
            Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 3000,
              maximumAge: 300000
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Low accuracy timeout')), 3000)
            )
          ]);
        }

        // VALIDAÇÃO ROBUSTA
        if (!position || !position.coords) {
          throw new Error('Invalid position object - no coords');
        }

        const { coords } = position;
        if (!coords.latitude || !coords.longitude) {
          throw new Error('Invalid coordinates - latitude or longitude missing');
        }

        const lat = parseFloat(coords.latitude.toString());
        const lng = parseFloat(coords.longitude.toString());

        if (!isValidLocation(lat, lng)) {
          throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
        }

        const location = { latitude: lat, longitude: lng };
        
        const endTime = performance.now();
        console.log(`✅ LOCATION: Valid location obtained in ${(endTime - startTime).toFixed(0)}ms:`, location);
        
        globalLocation = location;
        lastLocationTime = now;
        return location;

      } catch (capacitorError) {
        console.warn('❌ LOCATION: Capacitor failed, trying browser fallback:', capacitorError);
        
        // FALLBACK BROWSER MELHORADO
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          return new Promise((resolve) => {
            const successCallback = (position: GeolocationPosition) => {
              try {
                const lat = parseFloat(position.coords.latitude.toString());
                const lng = parseFloat(position.coords.longitude.toString());

                if (!isValidLocation(lat, lng)) {
                  console.error('❌ LOCATION: Browser returned invalid coordinates:', { lat, lng });
                  resolve(null);
                  return;
                }

                const location = { latitude: lat, longitude: lng };
                console.log('✅ LOCATION: Browser location obtained:', location);
                globalLocation = location;
                lastLocationTime = Date.now();
                resolve(location);
              } catch (error) {
                console.error('❌ LOCATION: Error processing browser location:', error);
                resolve(null);
              }
            };

            const errorCallback = (error: GeolocationPositionError) => {
              console.warn('⚠️ LOCATION: Browser geolocation failed:', error);
              resolve(null);
            };

            // Tentar alta precisão primeiro
            navigator.geolocation.getCurrentPosition(
              successCallback,
              (error) => {
                console.log('⚠️ LOCATION: Browser high accuracy failed, trying low accuracy...');
                // Fallback para baixa precisão
                navigator.geolocation.getCurrentPosition(
                  successCallback,
                  errorCallback,
                  {
                    enableHighAccuracy: false,
                    timeout: 3000,
                    maximumAge: 300000
                  }
                );
              },
              {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 10000
              }
            );
          });
        }
        
        console.error('💥 LOCATION: All geolocation methods failed');
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
        console.log('🎯 LOCATION: Using cache for immediate response');
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
        console.error('💥 LOCATION: Error in fetchLocation:', error);
        setState({
          location: null,
          loading: false,
          error: 'Erro ao obter localização'
        });
      }
    }, 50);
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
