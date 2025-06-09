
import React from "react";
import { Badge } from "@/components/ui/badge";
import type { SpaceApprovalStatus } from "@/types/approval";

interface SpaceStatusBadgeProps {
  status: SpaceApprovalStatus;
}

const SpaceStatusBadge: React.FC<SpaceStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Pendente
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          Aprovado
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          Rejeitado
        </Badge>
      );
  }
};

export default SpaceStatusBadge;
