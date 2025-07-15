
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserLocation } from './useUserLocation';

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
  const { location: userLocation } = useUserLocation();

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🚀 VENDORS_LOCATION: Fetching approved vendors...");
      
      // Buscar fornecedores aprovados com timeout otimizado
      const vendorsPromise = supabase
        .from("vendors")
        .select("*")
        .eq("status", "approved");

      const vendorsResult = await Promise.race([
        vendorsPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Vendors query timeout')), 5000)
        )
      ]);

      const { data, error } = vendorsResult as any;

      if (error) {
        console.error("❌ VENDORS_LOCATION: Error fetching vendors:", error);
        throw error;
      }

      console.log("📋 VENDORS_LOCATION: Vendors fetched:", data);
      console.log("📊 VENDORS_LOCATION: Number of approved vendors:", data ? data.length : 0);

      if (data) {
        const processedVendors = data.map((vendor) => {
          // Calcular distância se temos localização do usuário e do fornecedor
          let distanceKm: number | undefined;
          if (userLocation && vendor.latitude && vendor.longitude) {
            distanceKm = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
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
        console.log('✅ VENDORS_LOCATION: Vendors loaded and sorted by proximity:', processedVendors.length);
      }
    } catch (error) {
      console.error("💥 VENDORS_LOCATION: Error fetching vendors:", error);
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
