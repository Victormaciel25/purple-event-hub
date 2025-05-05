
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FavoriteSpace = {
  id: string;
  name: string;
  address: string;
  price: string;
  image: string;
  number?: string;
  state?: string;
};

// Criamos um estado global para armazenar os IDs dos favoritos
let globalFavoriteIds: string[] = [];
// Flag para controlar se os favoritos já foram inicializados do localStorage
let favoritesInitialized = false;

export const useEventSpaceFavorites = () => {
  // Inicializamos o estado local com o estado global
  const [favorites, setFavorites] = useState<string[]>([...globalFavoriteIds]);
  const [favoriteSpaces, setFavoriteSpaces] = useState<FavoriteSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa os favoritos do localStorage apenas uma vez
  useEffect(() => {
    if (!favoritesInitialized) {
      const savedFavorites = localStorage.getItem('eventSpaceFavorites');
      if (savedFavorites) {
        try {
          const parsedFavorites = JSON.parse(savedFavorites);
          if (Array.isArray(parsedFavorites)) {
            // Atualiza o estado global
            globalFavoriteIds = parsedFavorites;
            // Atualiza o estado local
            setFavorites(parsedFavorites);
          }
        } catch (e) {
          console.error("Erro ao carregar favoritos do localStorage:", e);
        }
      }
      favoritesInitialized = true;
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
    if (favoritesInitialized) {
      localStorage.setItem('eventSpaceFavorites', JSON.stringify(favorites));
      // Sincroniza com o estado global
      globalFavoriteIds = [...favorites];
    }
  }, [favorites]);

  // Carrega os espaços quando os favoritos mudarem
  useEffect(() => {
    if (validFavoriteIds.length > 0) {
      fetchFavoriteSpaces();
    } else {
      setFavoriteSpaces([]);
    }
  }, [validFavoriteIds]);
  
  const fetchFavoriteSpaces = useCallback(async () => {
    if (validFavoriteIds.length === 0) {
      setFavoriteSpaces([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Buscando espaços favoritos:", validFavoriteIds);
      
      // Fetch spaces from Supabase using only valid UUIDs
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, price, space_photos(storage_path)")
        .in("id", validFavoriteIds);
      
      if (error) {
        throw error;
      }
      
      console.log("Espaços encontrados:", data?.length || 0, data);
      
      // Process spaces to include image URLs
      const processedSpaces = await Promise.all((data || []).map(async (space) => {
        let imageUrl = "https://source.unsplash.com/random/600x400?event";
        
        // If there are photos, get the URL for the first one
        if (space.space_photos && space.space_photos.length > 0) {
          const { data: urlData } = await supabase.storage
            .from('spaces')
            .createSignedUrl(space.space_photos[0].storage_path, 3600);
            
          if (urlData) {
            imageUrl = urlData.signedUrl;
          }
        }
        
        return {
          id: space.id,
          name: space.name,
          address: `${space.address}, ${space.number} - ${space.state}`,
          price: space.price,
          image: imageUrl,
          number: space.number,
          state: space.state
        };
      }));
      
      setFavoriteSpaces(processedSpaces);
    } catch (error: any) {
      console.error("Error fetching favorite spaces:", error);
      setError(error.message || "Erro ao carregar espaços favoritos");
    } finally {
      setLoading(false);
    }
  }, [validFavoriteIds]);

  // Função para verificar se um espaço está favoritado
  const isFavorite = useCallback((id: string): boolean => {
    return globalFavoriteIds.includes(id);
  }, []);

  // Função para alternar o status de favorito de um espaço
  const toggleFavorite = useCallback((id: string) => {
    // Validate the ID is a UUID before adding to favorites
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id) && !globalFavoriteIds.includes(id)) {
      console.error("Invalid UUID format for favorite:", id);
      toast.error("Erro ao adicionar favorito: ID inválido");
      return;
    }
    
    // Atualiza o estado local
    const newFavorites = globalFavoriteIds.includes(id) 
      ? globalFavoriteIds.filter(favoriteId => favoriteId !== id)
      : [...globalFavoriteIds, id];
      
    // Atualiza o estado global e depois o estado local
    globalFavoriteIds = newFavorites;
    setFavorites(newFavorites);
    
    // Fornecer feedback ao usuário
    if (newFavorites.includes(id)) {
      toast.success("Espaço adicionado aos favoritos");
    } else {
      toast.success("Espaço removido dos favoritos");
    }
  }, []);

  return { 
    favorites: globalFavoriteIds, 
    favoriteSpaces, 
    loading, 
    error,
    isFavorite, 
    toggleFavorite,
    refreshFavorites: fetchFavoriteSpaces
  };
};
