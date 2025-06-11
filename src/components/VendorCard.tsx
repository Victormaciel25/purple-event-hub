
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Edit, Star } from "lucide-react";
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
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (status === 'pending') {
      navigate(`/vendor-pending/${id}`);
    } else {
      navigate(`/vendor/${id}`);
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
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

  return (
    <Card 
      className={`overflow-hidden border-0 card-shadow cursor-pointer transition-transform hover:scale-[1.01] ${
        isPromoted ? 'ring-2 ring-yellow-400' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex p-4">
        <div className="h-20 w-20 rounded-full overflow-hidden mr-4 relative">
          <OptimizedImage
            src={image}
            alt={name}
            className="w-full h-full"
          />
          {isPromoted && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
              <Star size={12} className="text-white fill-white" />
            </div>
          )}
        </div>
        <CardContent className="p-0 flex-1">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-base">{name}</h3>
              <Badge variant="outline" className="mt-1 bg-secondary text-xs">
                {category}
              </Badge>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {isPromoted && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
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
