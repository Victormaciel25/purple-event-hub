
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SUPABASE_CONFIG } from "@/config/app-config";
import { toast } from "sonner";
import { formatWorkingHours } from "@/lib/utils";

export type VendorDetailsType = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  description: string;
  address: string;
  working_hours?: string | null;
  available_days?: string[] | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  user_id: string;
  instagram?: string | null;
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
  onDelete?: () => void;
  approving?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  deleting?: boolean;
}

const dayTranslations: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const VendorDetails: React.FC<VendorDetailsProps> = ({
  selectedVendor,
  imageUrls,
  rejectionReason,
  setRejectionReason,
  onApprove,
  onReject,
  onClose,
  onDelete,
  approving = false,
  isAdmin = false,
  isSuperAdmin = false,
  deleting = false,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Format available days
  const availableDays = selectedVendor.available_days && selectedVendor.available_days.length > 0
    ? selectedVendor.available_days.map(day => dayTranslations[day] || day)
    : [];

  // Função para verificar se é vídeo
  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    const urlLower = url.toLowerCase();
    
    return videoExtensions.some(ext => urlLower.includes(ext)) ||
           urlLower.includes('video') ||
           urlLower.includes('.mp4') ||
           urlLower.includes('.webm') ||
           urlLower.includes('.mov');
  };

  // Ordenar URLs: imagens primeiro, vídeos por último
  const sortedImageUrls = [...imageUrls].sort((a, b) => {
    const aIsVideo = isVideo(a);
    const bIsVideo = isVideo(b);
    
    // Se a é vídeo e b não é, a vem depois
    if (aIsVideo && !bIsVideo) return 1;
    // Se b é vídeo e a não é, b vem depois
    if (!aIsVideo && bIsVideo) return -1;
    // Se ambos são do mesmo tipo, manter ordem original
    return 0;
  });
    
  const handleDelete = async () => {
    if (deleteReason.trim() === "") {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Call the updated edge function that sends email notifications
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/delete_vendor_with_notification`;
      
      console.log("Calling edge function for vendor deletion:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify({ 
          vendorId: selectedVendor.id,
          deleteReason: deleteReason
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Edge function error response:", errorText);
        throw new Error(`Error ${response.status}: ${errorText || "Unknown error"}`);
      }
      
      const result = await response.json();
      console.log("Edge function result:", result);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete vendor");
      }

      toast.success("Fornecedor excluído com sucesso e notificação enviada");
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Erro ao excluir fornecedor");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 max-h-[80vh] overflow-y-auto">
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
            <div>{formatWorkingHours(selectedVendor.working_hours || "")}</div>
          </div>
        )}

        {availableDays.length > 0 && (
          <div>
            <div className="font-medium">Dias Disponíveis</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableDays.map((day) => (
                <Badge key={day} variant="secondary" className="text-xs">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {selectedVendor.instagram && (
          <div>
            <div className="font-medium">Instagram</div>
            <a 
              href={selectedVendor.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {selectedVendor.instagram}
            </a>
          </div>
        )}
      </div>

      {/* Seção de imagens/vídeos */}
      <div>
        <h3 className="text-lg font-medium mb-2">Imagens e Vídeos</h3>
        {sortedImageUrls.length > 0 ? (
          <div className="space-y-6">
            {sortedImageUrls.map((url, index) => {
              const isVideoFile = isVideo(url);
              return (
                <div key={index} className="relative bg-gray-50 rounded-lg overflow-hidden">
                  <AspectRatio ratio={16 / 9} className="bg-muted">
                    {isVideoFile ? (
                      <video 
                        src={url} 
                        controls
                        className="w-full h-full object-contain"
                        preload="metadata"
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                    ) : (
                      <img 
                        src={url} 
                        alt={`Imagem ${index + 1} do fornecedor`}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </AspectRatio>
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                    {isVideoFile ? '🎥' : '📸'} {index + 1}/{sortedImageUrls.length}
                  </div>
                  <div className="p-3 bg-white border-t">
                    <p className="text-sm text-gray-600">
                      {isVideoFile ? 'Vídeo' : 'Imagem'} {index + 1} de {sortedImageUrls.length}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma imagem ou vídeo disponível</p>
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
                disabled={approving}
              >
                Fechar
              </Button>
              <Button
                variant="destructive"
                onClick={onReject}
                className="sm:w-1/3"
                disabled={approving}
              >
                Rejeitar
              </Button>
              <Button
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700 text-white sm:w-1/3"
                disabled={approving}
              >
                {approving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  "Aprovar"
                )}
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

      {/* Delete vendor button - only visible to admins */}
      {(isAdmin || isSuperAdmin) && (
        <Button
          variant="destructive"
          className="w-full mt-4"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting || deleting}
        >
          <Trash2 className="mr-2" size={18} />
          {isDeleting || deleting ? "Excluindo..." : "Excluir Fornecedor"}
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser
              desfeita e um email será enviado ao proprietário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da exclusão (obrigatório)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="mt-4"
            rows={3}
          />
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorDetails;
