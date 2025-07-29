
import React from "react";
import { Star, MapPin, Crown, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import OptimizedImage from "./OptimizedImage";

interface VendorCardProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  contactNumber: string;
  image: string;
  isPromoted?: boolean;
  address?: string;
}

const VendorCard = ({ 
  id, 
  name, 
  category, 
  rating, 
  contactNumber, 
  image, 
  isPromoted = false,
  address 
}: VendorCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/vendor/${id}`);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = contactNumber.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá, tenho interesse nos serviços de ${name}`);
    const whatsappUrl = `https://wa.me/+55${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative">
        <div className="h-48 overflow-hidden">
          <OptimizedImage
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            eager={true}
          />
        </div>
        {isPromoted && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full flex items-center text-xs font-medium shadow-lg">
            <Crown size={12} className="mr-1" />
            Promovido
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight">{name}</h3>
            <Badge variant="outline" className="mt-1 text-xs">
              {category}
            </Badge>
          </div>

          {address && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin size={14} className="mr-1 flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
            
            <Button
              size="sm"
              onClick={handleWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone size={14} className="mr-1" />
              Contato
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorCard;
