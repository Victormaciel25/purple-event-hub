
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Edit, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedImage from "./OptimizedImage";
import { useNavigate } from "react-router-dom";

interface VendorProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  contactNumber: string;
  image: string;
  status?: 'pending' | 'approved' | 'rejected';
  showEditButton?: boolean;
  isPromoted?: boolean;
  address?: string;
}

const VendorCard: React.FC<VendorProps> = ({
  id,
  name,
  category,
  rating,
  contactNumber,
  image,
  status,
  showEditButton = false,
  isPromoted = false,
  address,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log("🎯 VENDOR_CARD: Card clicked:", { id, name, status });
    if (status === 'pending') {
      navigate(`/vendor-pending/${id}`);
    } else {
      navigate(`/vendor/${id}`);
    }
  };

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/edit-vendor/${id}`);
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovado", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", className: "bg-red-100 text-red-800" }
    };

    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={`mt-2 text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // Garantir que a imagem tenha uma URL válida
  const imageUrl = image && image.trim() 
    ? image 
    : "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop";

  console.log("🖼️ VENDOR_CARD: Rendering vendor card:", { 
    id, 
    name, 
    imageUrl, 
    originalImage: image 
  });

  return (
    <Card 
      className={`overflow-hidden border-0 card-shadow cursor-pointer transition-transform hover:scale-[1.01] ${
        isPromoted ? 'ring-2 ring-yellow-400' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex p-4">
        <div className="h-20 w-20 rounded-full overflow-hidden mr-4 relative flex-shrink-0">
          <OptimizedImage
            src={imageUrl}
            alt={`${name} - ${category}`}
            className="w-full h-full"
            key={`${id}-${imageUrl}`} // Force re-render quando a imagem muda
          />
          {isPromoted && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
              <Star size={12} className="text-white fill-white" />
            </div>
          )}
        </div>
        <CardContent className="p-0 flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{name}</h3>
              <Badge variant="outline" className="mt-1 bg-secondary text-xs">
                {category}
              </Badge>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {isPromoted && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs flex items-center gap-1">
                  <Star size={12} className="fill-current" />
                  Destaque
                </Badge>
              )}
              {showEditButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                >
                  <Edit size={14} className="mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          {address && (
            <button 
              className="flex items-center text-iparty text-sm mt-2 min-w-0 w-full"
              onClick={handleAddressClick}
            >
              <MapPin size={14} className="mr-1 flex-shrink-0" />
              <span className="truncate">{address}</span>
            </button>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default VendorCard;
