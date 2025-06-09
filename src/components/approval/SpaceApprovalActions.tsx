
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface SpaceApprovalActionsProps {
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading?: boolean;
}

const SpaceApprovalActions: React.FC<SpaceApprovalActionsProps> = ({
  onApprove,
  onReject,
  loading = false
}) => {
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    onReject(rejectionReason);
    setRejectionReason("");
  };

  return (
    <Card className="p-4">
      <Textarea
        placeholder="Motivo da rejeição (obrigatório para rejeitar)"
        value={rejectionReason}
        onChange={(e) => setRejectionReason(e.target.value)}
        className="resize-none mb-4"
        rows={3}
      />
      
      <div className="flex justify-between">
        <Button 
          variant="destructive" 
          onClick={handleReject}
          disabled={loading || !rejectionReason.trim()}
        >
          <X size={16} className="mr-1" />
          Rejeitar
        </Button>
        
        <Button 
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={onApprove}
          disabled={loading}
        >
          <Check size={16} className="mr-1" />
          Aprovar
        </Button>
      </div>
    </Card>
  );
};

export default SpaceApprovalActions;
