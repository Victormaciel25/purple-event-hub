
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import OptimizedImage from "./OptimizedImage";

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
  rating,
  contactNumber,
  image,
}) => {
  return (
    <Card className="overflow-hidden border-0 card-shadow">
      <div className="flex p-4">
        <div className="h-16 w-16 rounded-full overflow-hidden mr-4">
          <OptimizedImage
            src={image}
            alt={name}
            className="w-full h-full"
          />
        </div>
        <CardContent className="p-0 flex-1">
          <div className="flex justify-between">
            <h3 className="font-semibold text-base">{name}</h3>
            <div className="flex items-center text-yellow-500">
              <span className="text-sm font-medium">{rating}</span>
              <span className="ml-1">★</span>
            </div>
          </div>
          <Badge variant="outline" className="mt-1 bg-secondary text-xs">
            {category}
          </Badge>
          <button className="flex items-center text-iparty text-sm mt-2">
            <Phone size={14} className="mr-1" />
            <span>{contactNumber}</span>
          </button>
        </CardContent>
      </div>
    </Card>
  );
};

export default VendorCard;
