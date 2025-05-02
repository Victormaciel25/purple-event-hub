
import React from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  return (
    <TableRow>
      <TableCell className="font-medium truncate max-w-[150px]" title={space.name}>
        {space.name}
      </TableCell>
      <TableCell className="truncate max-w-[150px]" title={`${space.profiles?.first_name || ''} ${space.profiles?.last_name || ''}`}>
        {space.profiles?.first_name} {space.profiles?.last_name}
      </TableCell>
      <TableCell>{formatDate(space.created_at)}</TableCell>
      <TableCell>{space.photo_count || 0}</TableCell>
      <TableCell>{getStatusBadge(space.status)}</TableCell>
      <TableCell>
        <Button 
          onClick={() => onViewDetails(space.id)}
          variant="outline" 
          size="sm"
        >
          Detalhes
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default SpaceListItem;
