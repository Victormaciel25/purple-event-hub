
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

// Cache global da localização para compartilhar entre componentes
let cachedLocation: UserLocation | null = null;
let locationPromise: Promise<UserLocation | null> | null = null;

export const useUserLocation = () => {
  const [state, setState] = useState<LocationState>({
    location: cachedLocation,
    loading: !cachedLocation,
    error: null
  });

  const getUserLocation = useCallback(async (): Promise<UserLocation | null> => {
    // Se já temos uma localização cached, retornar imediatamente
    if (cachedLocation) {
      return cachedLocation;
    }

    // Se já existe uma promise em andamento, aguardar ela
    if (locationPromise) {
      return locationPromise;
    }

    // Criar nova promise para obter localização
    locationPromise = (async () => {
      try {
        console.log('🔍 LOCATION: Requesting permissions...');
        
        // Verificar e solicitar permissões com timeout reduzido
        const permissions = await Promise.race([
          Geolocation.requestPermissions(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Permission timeout')), 3000)
          )
        ]);

        console.log('📍 LOCATION: Permissions result:', permissions);
        
        if ((permissions as any).location === 'denied') {
          throw new Error('Location permission denied');
        }

        console.log('🌍 LOCATION: Getting current position...');
        const position = await Promise.race([
          Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 300000 // 5 minutos
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 5000)
          )
        ]);

        const location = {
          latitude: (position as any).coords.latitude,
          longitude: (position as any).coords.longitude
        };
        
        console.log('✅ LOCATION: Location obtained:', location);
        cachedLocation = location;
        return location;
      } catch (error) {
        console.warn('❌ LOCATION: Capacitor failed, trying browser fallback:', error);
        
        // Fallback para web/navegador
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          console.log('🔄 LOCATION: Using browser geolocation fallback...');
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                console.log('✅ LOCATION: Browser location obtained:', location);
                cachedLocation = location;
                resolve(location);
              },
              (error) => {
                console.warn('⚠️ LOCATION: Browser geolocation failed:', error);
                resolve(null);
              },
              {
                enableHighAccuracy: true,
                timeout: 5000,
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
    if (cachedLocation) {
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
