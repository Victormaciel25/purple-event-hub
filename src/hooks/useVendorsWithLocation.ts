
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
};

export const useVendorsWithLocation = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching approved vendors...");
      
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
        const processedVendors = data.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          category: vendor.category,
          contact_number: vendor.contact_number,
          images: vendor.images || [],
          address: vendor.address
        }));

        setVendors(processedVendors);
        console.log('Vendors loaded:', processedVendors.length);
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
    userLocation: null // Since vendors don't have location data, this is always null
  };
};
