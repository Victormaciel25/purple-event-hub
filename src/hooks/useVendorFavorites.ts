
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export type FavoriteVendor = {
  id: string;
  name: string;
  category: string;
  address: string;
  contact_number: string;
  description: string;
  images?: string[] | null;
};

// Estado global para armazenar os IDs dos favoritos de fornecedores
let globalVendorFavoriteIds: string[] = [];
// Flag para controlar se os favoritos já foram inicializados do localStorage
let vendorFavoritesInitialized = false;

export const useVendorFavorites = () => {
  // Inicializamos o estado local com o estado global
  const [favorites, setFavorites] = useState<string[]>([...globalVendorFavoriteIds]);
  const [favoriteVendors, setFavoriteVendors] = useState<FavoriteVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa os favoritos do localStorage apenas uma vez
  useEffect(() => {
    if (!vendorFavoritesInitialized) {
      const savedFavorites = localStorage.getItem('vendorFavorites');
      if (savedFavorites) {
        try {
          const parsedFavorites = JSON.parse(savedFavorites);
          setFavorites(parsedFavorites);
          globalVendorFavoriteIds = parsedFavorites;
        } catch (e) {
          console.error("Erro ao carregar favoritos de fornecedores do localStorage:", e);
        }
      }
      vendorFavoritesInitialized = true;
    }
  }, []);

  // Memorize os IDs válidos para evitar consultas desnecessárias
  const validFavoriteIds = useMemo(() => {
    return favorites.filter(id => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidPattern.test(id);
    });
  }, [favorites]);

  // Salva os favoritos no localStorage sempre que mudar
  useEffect(() => {
    if (vendorFavoritesInitialized) {
      localStorage.setItem('vendorFavorites', JSON.stringify(favorites));
      globalVendorFavoriteIds = [...favorites];
    }
  }, [favorites]);

  // Carrega os fornecedores quando os favoritos mudarem
  useEffect(() => {
    if (validFavoriteIds.length > 0) {
      fetchFavoriteVendors();
    } else {
      setFavoriteVendors([]);
      setError(null);
    }
  }, [validFavoriteIds]);
  
  // Fetch favorited vendors from the database
  const fetchFavoriteVendors = useCallback(async () => {
    if (validFavoriteIds.length === 0) {
      setFavoriteVendors([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Buscando fornecedores favoritos:", validFavoriteIds);
      
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, category, address, contact_number, description, images")
        .in("id", validFavoriteIds)
        .eq("status", "approved");
      
      if (error) {
        throw error;
      }
      
      console.log("Fornecedores encontrados:", data?.length || 0);
      
      setFavoriteVendors(data || []);
    } catch (error: any) {
      console.error("Error fetching favorite vendors:", error);
      setError(error.message || "Erro ao carregar fornecedores favoritos");
    } finally {
      setLoading(false);
    }
  }, [validFavoriteIds]);

  // Função para verificar se um fornecedor está favoritado
  const isFavorite = useCallback((id: string): boolean => {
    return favorites.includes(id);
  }, [favorites]);

  // Função para alternar o status de favorito de um fornecedor
  const toggleFavorite = useCallback((id: string) => {
    // Validate the ID is a UUID before adding to favorites
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id) && !favorites.includes(id)) {
      console.error("Invalid UUID format for favorite:", id);
      return;
    }
    
    // Calculate new favorites list
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(favoriteId => favoriteId !== id)
      : [...favorites, id];
      
    // Update local state first
    setFavorites(newFavorites);
    
    // Update global state
    globalVendorFavoriteIds = [...newFavorites];
  }, [favorites]);

  return { 
    favorites, 
    favoriteVendors, 
    loading, 
    error,
    isFavorite, 
    toggleFavorite,
    refreshFavorites: fetchFavoriteVendors
  };
};
