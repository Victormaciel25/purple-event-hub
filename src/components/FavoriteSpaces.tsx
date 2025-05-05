
import React from "react";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import EventSpaceCard from "./EventSpaceCard";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const FavoriteSpaces: React.FC = () => {
  const { favoriteSpaces, loading, favorites, error, refreshFavorites } = useEventSpaceFavorites();
  
  const handleRefresh = () => {
    refreshFavorites();
    toast.info("Atualizando favoritos...");
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <span className="ml-2">Carregando seus favoritos...</span>
      </div>
    );
  }

  // Verificamos se há inconsistência entre os favoritos e os espaços carregados
  if (favorites.length > 0 && favoriteSpaces.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">Não foi possível carregar seus espaços favoritos. Verifique sua conexão ou tente novamente mais tarde.</p>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          <span>Tentar novamente</span>
        </Button>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          <span>Tentar novamente</span>
        </Button>
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
