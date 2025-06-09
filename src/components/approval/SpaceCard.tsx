
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SpaceStatusBadge from "./SpaceStatusBadge";
import type { SpaceWithProfile } from "@/types/approval";

interface SpaceCardProps {
  space: SpaceWithProfile;
  onViewDetails: (id: string) => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({ space, onViewDetails }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const ownerName = `${space.profiles?.first_name || ''} ${space.profiles?.last_name || ''}`.trim();

  return (
    <Card className="p-4 shadow-sm border">
      <div className="flex justify-between items-start mb-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="font-medium text-lg truncate max-w-[200px]">{space.name}</h3>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{space.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <SpaceStatusBadge status={space.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-muted-foreground">Proprietário:</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate max-w-[150px]">{ownerName || "Não informado"}</p>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{ownerName || "Não informado"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div>
          <p className="text-muted-foreground">Data:</p>
          <p>{formatDate(space.created_at)}</p>
        </div>
        
        <div>
          <p className="text-muted-foreground">Fotos:</p>
          <p>{space.photo_count || 0}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Valor:</p>
          <div className="flex items-center">
            <DollarSign size={12} className="text-gray-500 mr-1" />
            <p>{space.price ? `R$ ${space.price}` : "Não informado"}</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-2">
        <Button 
          onClick={() => onViewDetails(space.id)}
          variant="outline" 
          size="sm"
          className="flex items-center"
        >
          <Eye size={16} className="mr-1" />
          Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default SpaceCard;
