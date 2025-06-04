
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { useNavigate } from "react-router-dom";

interface VendorProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  contactNumber: string;
  image: string;
}

const VendorCard: React.FC<VendorProps> = ({
  id,
  name,
  category,
  rating, // We'll keep this in the props interface for now to avoid breaking existing code
  contactNumber,
  image,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/vendor/${id}`);
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking on phone
  };

  return (
    <Card 
      className="overflow-hidden border-0 card-shadow cursor-pointer transition-transform hover:scale-[1.01]" 
      onClick={handleClick}
    >
      <div className="flex p-4">
        <div className="h-20 w-20 rounded-full overflow-hidden mr-4">
          <OptimizedImage
            src={image}
            alt={name}
            className="w-full h-full"
          />
        </div>
        <CardContent className="p-0 flex-1">
          <h3 className="font-semibold text-base">{name}</h3>
          <Badge variant="outline" className="mt-1 bg-secondary text-xs">
            {category}
          </Badge>
          <button 
            className="flex items-center text-iparty text-sm mt-2"
            onClick={handlePhoneClick}
          >
            <Phone size={14} className="mr-1" />
            <span>{contactNumber}</span>
          </button>
        </CardContent>
      </div>
    </Card>
  );
};

export default VendorCard;
