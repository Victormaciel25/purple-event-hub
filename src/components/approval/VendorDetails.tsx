
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Input,
  Textarea,
} from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export type VendorDetailsType = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  description: string;
  address: string;
  working_hours?: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  images?: string[] | null;
};

interface VendorDetailsProps {
  selectedVendor: VendorDetailsType;
  imageUrls: string[];
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

const VendorDetails: React.FC<VendorDetailsProps> = ({
  selectedVendor,
  imageUrls,
  rejectionReason,
  setRejectionReason,
  onApprove,
  onReject,
  onClose,
}) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="font-medium">Categoria</div>
          <div>{selectedVendor.category}</div>
        </div>

        <div>
          <div className="font-medium">Descrição</div>
          <div className="whitespace-pre-wrap">{selectedVendor.description}</div>
        </div>

        <div>
          <div className="font-medium">Endereço</div>
          <div>{selectedVendor.address}</div>
        </div>

        <div>
          <div className="font-medium">Contato</div>
          <div>{selectedVendor.contact_number}</div>
        </div>

        {selectedVendor.working_hours && (
          <div>
            <div className="font-medium">Horário de Funcionamento</div>
            <div>{selectedVendor.working_hours}</div>
          </div>
        )}
      </div>

      {/* Seção de imagens */}
      <div>
        <h3 className="text-lg font-medium mb-2">Imagens</h3>
        {imageUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="aspect-video">
                <img 
                  src={url} 
                  alt={`Imagem ${index + 1} do fornecedor`}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma imagem disponível</p>
        )}
      </div>

      <Separator className="my-4" />
      
      {selectedVendor.status === 'pending' ? (
        <>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Motivo da rejeição (caso não aprovado)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                placeholder="Descreva o motivo da rejeição..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                onClick={onClose}
                className="sm:w-1/3"
              >
                Fechar
              </Button>
              <Button
                variant="destructive"
                onClick={onReject}
                className="sm:w-1/3"
              >
                Rejeitar
              </Button>
              <Button
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700 text-white sm:w-1/3"
              >
                Aprovar
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      )}

      {/* Exibe motivo da rejeição se for rejeitado */}
      {selectedVendor.status === 'rejected' && selectedVendor.rejection_reason && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-semibold text-red-800">Motivo da rejeição:</h4>
          <p className="text-red-700">{selectedVendor.rejection_reason}</p>
        </div>
      )}
    </div>
  );
};

export default VendorDetails;
