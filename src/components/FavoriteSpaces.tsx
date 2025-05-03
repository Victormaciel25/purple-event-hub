
import React from "react";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import EventSpaceCard from "./EventSpaceCard";
import { Loader2 } from "lucide-react";

const FavoriteSpaces: React.FC = () => {
  const { favoriteSpaces, loading } = useEventSpaceFavorites();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <span className="ml-2">Carregando seus favoritos...</span>
      </div>
    );
  }

  if (favoriteSpaces.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você ainda não tem espaços favoritos.</p>
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
