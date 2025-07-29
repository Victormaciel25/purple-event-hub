
import React from "react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface VendorItemProps {
  id: string;
  name: string;
  category: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface VendorListItemProps extends VendorItemProps {
  onViewDetails: (vendorId: string) => void;
}

const VendorListItem: React.FC<VendorListItemProps> = ({
  id,
  name,
  category,
  created_at,
  status,
  profiles,
  onViewDetails,
}) => {
  const formattedTime = formatDistanceToNow(new Date(created_at), { 
    addSuffix: true,
    locale: ptBR
  });

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const submitterName = profiles
    ? `${profiles.first_name || ""} ${profiles.last_name || ""}`.trim() || "Usuário"
    : "Usuário";

  return (
    <div className="border rounded-md p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-lg">{name}</h3>
          <p className="text-muted-foreground text-sm">
            Categoria: {category}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColor[status]}`}>
          {status === "pending" && "Pendente"}
          {status === "approved" && "Aprovado"}
          {status === "rejected" && "Rejeitado"}
        </span>
      </div>

      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-muted-foreground">
          Enviado por <span className="font-medium">{submitterName}</span> {formattedTime}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(id)}
        >
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
};

export default VendorListItem;
