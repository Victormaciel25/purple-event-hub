
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SpaceWithProfileInfo = {
  id: string;
  name: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
  photo_count?: number;
};

type SpaceListItemProps = {
  space: SpaceWithProfileInfo;
  onViewDetails: (id: string) => void;
};

const SpaceListItem: React.FC<SpaceListItemProps> = ({ space, onViewDetails }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejeitado</Badge>;
    }
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
        
        {getStatusBadge(space.status)}
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

export default SpaceListItem;
