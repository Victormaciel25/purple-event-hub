
import { useState, useEffect } from 'react';
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

export const useEventSpaceFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('eventSpaceFavorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });
  
  const [favoriteSpaces, setFavoriteSpaces] = useState<FavoriteSpace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('eventSpaceFavorites', JSON.stringify(favorites));
    
    // When favorites change, fetch the full space data for each favorite ID
    if (favorites.length > 0) {
      fetchFavoriteSpaces();
    } else {
      setFavoriteSpaces([]);
    }
  }, [favorites]);
  
  const fetchFavoriteSpaces = async () => {
    if (favorites.length === 0) return;
    
    setLoading(true);
    
    try {
      // Fetch spaces from Supabase
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, price, space_photos(storage_path)")
        .in("id", favorites);
      
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

  const isFavorite = (id: string) => favorites.includes(id);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(favoriteId => favoriteId !== id) 
        : [...prev, id]
    );
  };

  return { favorites, favoriteSpaces, loading, isFavorite, toggleFavorite };
};
