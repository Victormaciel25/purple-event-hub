
import React from "react";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import EventSpaceCard from "./EventSpaceCard";
import { Loader2 } from "lucide-react";

const FavoriteSpaces: React.FC = () => {
  const { favoriteSpaces, loading, favorites, error } = useEventSpaceFavorites();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <span className="ml-2">Carregando seus favoritos...</span>
      </div>
    );
  }

  // Verificamos se há erro ao carregar os espaços
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você ainda não tem espaços favoritos</p>
        <p className="text-muted-foreground mt-2">Explore e adicione aos seus favoritos para vê-los aqui</p>
      </div>
    );
  }
  
  // Verificamos se o usuário não tem nenhum favorito
  if (favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você ainda não tem espaços favoritos</p>
        <p className="text-muted-foreground mt-2">Explore e adicione aos seus favoritos para vê-los aqui</p>
      </div>
    );
  }
  
  // Verificamos se há problema de conectividade
  // (há IDs de favoritos mas não conseguimos carregar os dados)
  if (favorites.length > 0 && favoriteSpaces.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você ainda não tem espaços favoritos</p>
        <p className="text-muted-foreground mt-2">Explore e adicione aos seus favoritos para vê-los aqui</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {favoriteSpaces.map(space => (
        <EventSpaceCard 
          key={space.id} 
          id={space.id}
          name={space.name}
          address={space.address}
          price={parseFloat(space.price)}
          image={space.image}
        />
      ))}
    </div>
  );
};

export default FavoriteSpaces;
