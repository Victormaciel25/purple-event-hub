
import { useState, useEffect, useMemo } from 'react';
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

// Criamos uma variável global para armazenar o estado dos favoritos
// Isso garante que todas as instâncias do hook compartilhem o mesmo estado
let globalFavorites: string[] = [];

export const useEventSpaceFavorites = () => {
  // Usamos o estado global como valor inicial
  const [favorites, setFavorites] = useState<string[]>(() => {
    // Se já temos favoritos no estado global, usamos eles
    if (globalFavorites.length > 0) {
      return [...globalFavorites];
    }
    
    // Caso contrário, carregamos do localStorage
    const savedFavorites = localStorage.getItem('eventSpaceFavorites');
    const parsedFavorites = savedFavorites ? JSON.parse(savedFavorites) : [];
    
    // Atualizamos o estado global
    globalFavorites = parsedFavorites;
    return parsedFavorites;
  });
  
  const [favoriteSpaces, setFavoriteSpaces] = useState<FavoriteSpace[]>([]);
  const [loading, setLoading] = useState(false);

  // Memorize os IDs válidos para evitar consultas desnecessárias
  const validFavoriteIds = useMemo(() => {
    return favorites.filter(id => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidPattern.test(id);
    });
  }, [favorites]);

  // Salva os favoritos no localStorage e atualiza o estado global sempre que mudar
  useEffect(() => {
    localStorage.setItem('eventSpaceFavorites', JSON.stringify(favorites));
    globalFavorites = [...favorites]; // Atualiza o estado global
    
    if (validFavoriteIds.length > 0) {
      fetchFavoriteSpaces();
    } else {
      setFavoriteSpaces([]);
    }
  }, [validFavoriteIds]);
  
  const fetchFavoriteSpaces = async () => {
    if (validFavoriteIds.length === 0) return;
    
    setLoading(true);
    
    try {
      // Fetch spaces from Supabase using only valid UUIDs
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, price, space_photos(storage_path)")
        .in("id", validFavoriteIds);
      
      if (error) {
        throw error;
      }
      
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
    } catch (error) {
      console.error("Error fetching favorite spaces:", error);
      toast.error("Erro ao carregar espaços favoritos");
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se um espaço está favoritado
  const isFavorite = (id: string): boolean => {
    return favorites.includes(id);
  };

  // Função para alternar o status de favorito de um espaço
  const toggleFavorite = (id: string) => {
    // Validate the ID is a UUID before adding to favorites
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id) && !favorites.includes(id)) {
      console.error("Invalid UUID format for favorite:", id);
      toast.error("Erro ao adicionar favorito: ID inválido");
      return;
    }
    
    // Atualiza o estado local
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(favoriteId => favoriteId !== id)
      : [...favorites, id];
      
    setFavorites(newFavorites);
    
    // Fornecer feedback ao usuário
    if (newFavorites.includes(id)) {
      toast.success("Espaço adicionado aos favoritos");
    } else {
      toast.success("Espaço removido dos favoritos");
    }
  };

  return { favorites, favoriteSpaces, loading, isFavorite, toggleFavorite };
};
