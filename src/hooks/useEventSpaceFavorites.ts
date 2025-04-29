
import { useState, useEffect } from 'react';

export const useEventSpaceFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const savedFavorites = localStorage.getItem('eventSpaceFavorites');
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  });

  useEffect(() => {
    localStorage.setItem('eventSpaceFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(favoriteId => favoriteId !== id) 
        : [...prev, id]
    );
  };

  return { favorites, isFavorite, toggleFavorite };
};
