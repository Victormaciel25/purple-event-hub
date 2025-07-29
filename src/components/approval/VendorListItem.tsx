
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, MapPin, Calendar, Clock } from "lucide-react";
import OptimizedImage from "../OptimizedImage";

export interface VendorItemProps {
  id: string;
  name: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  contact_number: string;
  description?: string;
  address?: string;
  created_at: string;
  images?: string[];
  working_hours?: string;
  available_days?: string[];
}

interface VendorListItemProps extends VendorItemProps {
  onViewDetails: (vendorId: string) => void;
}

const VendorListItem: React.FC<VendorListItemProps> = ({
  id,
  name,
  category,
  status,
  contact_number,
  description,
  address,
  created_at,
  images,
  working_hours,
  available_days,
  onViewDetails,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      case "pending":
        return "Pendente";
      default:
        return "Desconhecido";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const firstImage = images && images.length > 0 
    ? images[0] 
    : "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop";

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <OptimizedImage
              src={firstImage}
              alt={name}
              className="w-full h-full object-cover"
              eager={true}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{name}</h3>
                <Badge variant="outline" className="text-xs mt-1">
                  {category}
                </Badge>
              </div>
              <Badge className={`${getStatusColor(status)} text-xs ml-2`}>
                {getStatusText(status)}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              {address && (
                <div className="flex items-center">
                  <MapPin size={14} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <Phone size={14} className="mr-1 flex-shrink-0" />
                <span>{contact_number}</span>
              </div>

              {working_hours && (
                <div className="flex items-center">
                  <Clock size={14} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{working_hours}</span>
                </div>
              )}

              <div className="flex items-center">
                <Calendar size={14} className="mr-1 flex-shrink-0" />
                <span>Cadastrado em {formatDate(created_at)}</span>
              </div>
            </div>

            {description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(id)}
              className="whitespace-nowrap"
            >
              <Eye size={16} className="mr-1" />
              Ver Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorListItem;
