
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  images: string[];
  rating?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

// Função para calcular distância entre dois pontos em km usando fórmula de Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useVendorsWithLocation = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const getUserLocation = async (): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('Geolocalização não suportada pelo navegador');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('Localização do usuário obtida:', location);
          resolve(location);
        },
        (error) => {
          console.log('Erro ao obter localização:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos
        }
      );
    });
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching approved vendors...");
      
      // Obter localização do usuário
      const location = await getUserLocation();
      setUserLocation(location);

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching vendors:", error);
        throw error;
      }

      console.log("Vendors fetched:", data);
      console.log("Number of approved vendors:", data ? data.length : 0);

      if (data) {
        const processedVendors = data.map((vendor) => {
          // Calcular distância se temos localização do usuário e do fornecedor
          let distanceKm: number | undefined;
          if (location && vendor.latitude && vendor.longitude) {
            distanceKm = calculateDistance(
              location.latitude,
              location.longitude,
              parseFloat(vendor.latitude.toString()),
              parseFloat(vendor.longitude.toString())
            );
          }

          return {
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            contact_number: vendor.contact_number,
            images: vendor.images || [],
            address: vendor.address,
            latitude: vendor.latitude ? parseFloat(vendor.latitude.toString()) : undefined,
            longitude: vendor.longitude ? parseFloat(vendor.longitude.toString()) : undefined,
            distanceKm
          };
        });

        // Ordenar fornecedores por proximidade (mais próximos primeiro)
        processedVendors.sort((a, b) => {
          if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

        setVendors(processedVendors);
        console.log('Vendors loaded and sorted by proximity:', processedVendors.length);
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      setError("Não foi possível carregar os fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchVendors();
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return {
    vendors,
    loading,
    error,
    refetch,
    userLocation
  };
};
