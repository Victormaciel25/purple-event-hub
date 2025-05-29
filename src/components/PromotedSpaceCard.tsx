
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Heart, Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import OptimizedImage from "./OptimizedImage";
import { Badge } from "@/components/ui/badge";

interface PromotedSpaceCardProps {
  id: string;
  name: string;
  address: string;
  price: number;
  image: string;
  isPromoted?: boolean;
  promotionExpiresAt?: string;
  showTimer?: boolean; // New prop to control timer display
}

const PromotedSpaceCard: React.FC<PromotedSpaceCardProps> = ({
  id,
  name,
  address,
  price,
  image,
  isPromoted = false,
  promotionExpiresAt,
  showTimer = false,
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
  
  const formatPrice = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const isSpaceFavorite = isFavorite(id);

  const getPromotionTimeLeft = () => {
    if (!promotionExpiresAt) return null;
    
    const now = new Date();
    const expires = new Date(promotionExpiresAt);
    const diffInHours = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h restantes`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} dias restantes`;
    }
  };
  
  return (
    <Card 
      className={`event-card border-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] relative ${
        isPromoted ? 'ring-2 ring-yellow-400 shadow-lg' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        {isPromoted && (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
            <Star size={12} className="fill-current" />
            Destaque
          </Badge>
        )}
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
      
      {isPromoted && promotionExpiresAt && showTimer && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="bg-black/70 text-white flex items-center gap-1">
            <Clock size={12} />
            {getPromotionTimeLeft()}
          </Badge>
        </div>
      )}
      
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

export default PromotedSpaceCard;
