
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import OptimizedImage from "./OptimizedImage";

interface EventSpaceProps {
  id: string;
  name: string;
  address: string;
  price: number;
  image: string;
}

const EventSpaceCard: React.FC<EventSpaceProps> = ({
  id,
  name,
  address,
  price,
  image,
}) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  
  const handleCardClick = () => {
    navigate(`/event-space/${id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
  };
  
  // Formatar preço como moeda brasileira
  const formatPrice = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  // Verificar explicitamente se o espaço está nos favoritos
  const isSpaceFavorite = isFavorite(id);
  
  return (
    <Card 
      className="event-card border-0 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] relative"
      onClick={handleCardClick}
    >
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={handleFavoriteClick}
          className="bg-white/70 hover:bg-white p-2 rounded-full transition-colors"
          aria-label={isSpaceFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          type="button"
        >
          <Heart 
            size={20} 
            className={isSpaceFavorite ? "fill-red-500 text-red-500" : "text-gray-500"} 
          />
        </button>
      </div>
      <div className="relative h-48 overflow-hidden">
        <OptimizedImage
          src={image || ""}
          alt={name}
          className="w-full h-full"
          fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop"
        />
        <div className="absolute bottom-0 right-0 bg-iparty text-white px-3 py-1 text-sm font-medium rounded-tl-lg">
          {formatPrice(price)}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 
          className="font-semibold text-lg leading-tight mb-1 line-clamp-2" 
          title={name}
        >
          {name}
        </h3>
        <div className="flex items-center text-muted-foreground text-sm">
          <MapPin size={14} className="mr-1 flex-shrink-0" />
          <span className="truncate line-clamp-1" title={address}>{address}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventSpaceCard;
