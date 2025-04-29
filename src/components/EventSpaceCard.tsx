
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  
  const handleCardClick = () => {
    navigate(`/event-space/${id}`);
  };
  
  return (
    <Card 
      className="event-card border-0 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
      onClick={handleCardClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 right-0 bg-iparty text-white px-3 py-1 text-sm font-medium rounded-tl-lg">
          R$ {price}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg leading-tight mb-1">{name}</h3>
        <div className="flex items-center text-muted-foreground text-sm">
          <MapPin size={14} className="mr-1" />
          <span className="truncate">{address}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventSpaceCard;
