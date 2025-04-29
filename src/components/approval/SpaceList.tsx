
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import SpaceListItem from "./SpaceListItem";

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

type SpaceListProps = {
  spaces: SpaceWithProfileInfo[];
  loading: boolean;
  onViewDetails: (id: string) => void;
};

const SpaceList: React.FC<SpaceListProps> = ({ spaces, loading, onViewDetails }) => {
  if (loading) {
    return <div className="p-8 text-center">Carregando espaços...</div>;
  }

  if (spaces.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Nenhum espaço encontrado para aprovação.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Proprietário</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Fotos</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {spaces.map((space) => (
          <SpaceListItem 
            key={space.id} 
            space={space} 
            onViewDetails={onViewDetails} 
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default SpaceList;
