
import React from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

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
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pendente</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Aprovado</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejeitado</span>;
    }
  };

  return (
    <TableRow>
      <TableCell>{space.name}</TableCell>
      <TableCell>
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
