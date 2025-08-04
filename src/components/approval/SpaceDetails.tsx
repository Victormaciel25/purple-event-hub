import React, { useState } from "react";
import {
  TabsContent,
  Tabs,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Check,
  X,
  MapPin,
  Home,
  User,
  Phone,
  Image,
  DollarSign,
  Trash2,
  Instagram
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SpaceDetailsProps = {
  selectedSpace: SpaceDetailsType;
  photoUrls: string[];
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
};

export type SpaceDetailsType = {
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
  phone: string;
  description: string;
  address: string;
  state: string;
  number: string;
  zip_code: string;
  price: string;
  capacity: string;
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
  latitude: number | null;
  longitude: number | null;
  rejection_reason: string | null;
  instagram: string | null;
  photos?: { id: string; storage_path: string }[];
};

const SpaceDetails: React.FC<SpaceDetailsProps> = ({
  selectedSpace,
  photoUrls,
  rejectionReason,
  setRejectionReason,
  onApprove,
  onReject
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingSpace, setDeletingSpace] = useState(false);
  const { isAdmin } = useUserRoles();

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
  const sortedPhotoUrls = [...photoUrls].sort((a, b) => {
    const aIsVideo = isVideo(a);
    const bIsVideo = isVideo(b);
    
    // Se a é vídeo e b não é, a vem depois
    if (aIsVideo && !bIsVideo) return 1;
    // Se b é vídeo e a não é, b vem depois
    if (!aIsVideo && bIsVideo) return -1;
    // Se ambos são do mesmo tipo, manter ordem original
    return 0;
  });

  const handleDeleteSpace = async () => {
    if (!deleteReason.trim()) {
      toast.error("Por favor, forneça um motivo para a exclusão");
      return;
    }

    try {
      setDeletingSpace(true);

      // Criar uma notificação para o proprietário do espaço
      const { error: notificationError } = await supabase
        .from("space_deletion_notifications")
        .insert({
          user_id: selectedSpace.user_id,
          space_name: selectedSpace.name,
          deletion_reason: deleteReason
        });

      if (notificationError) {
        console.error("Erro ao criar notificação:", notificationError);
        toast.error("Erro ao notificar o proprietário");
      }

      // Excluir o espaço usando a função existente
      const { error } = await supabase.functions.invoke("delete_space_with_photos", {
        body: { space_id: selectedSpace.id }
      });

      if (error) throw error;

      toast.success("Espaço excluído com sucesso");
      setDeleteDialogOpen(false);
      
    } catch (error) {
      console.error("Erro ao excluir espaço:", error);
      toast.error("Erro ao excluir espaço");
    } finally {
      setDeletingSpace(false);
    }
  };

  console.log("SpaceDetails received photoUrls:", sortedPhotoUrls);
  console.log("Total photoUrls count:", sortedPhotoUrls?.length || 0);

  return (
    <div className="mt-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">Fotos ({sortedPhotoUrls?.length || 0})</TabsTrigger>
          <TabsTrigger value="location" className="flex-1">Localização</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-start">
              <Home className="text-gray-400 mt-1 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Descrição</p>
                <p className="text-sm">{selectedSpace.description}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <Phone className="text-gray-400 mr-3" size={18} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Telefone</p>
                  <p className="text-sm">{selectedSpace.phone}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <User className="text-gray-400 mr-3" size={18} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Capacidade</p>
                  <p className="text-sm">{selectedSpace.capacity} pessoas</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center">
              <DollarSign className="text-gray-400 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Valor</p>
                <p className="text-sm">R$ {selectedSpace.price}</p>
              </div>
            </div>
          </Card>

          {selectedSpace.instagram && (
            <Card className="p-4">
              <div className="flex items-center">
                <Instagram className="text-gray-400 mr-3" size={18} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Instagram</p>
                  <a 
                    href={selectedSpace.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedSpace.instagram}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center">
              <MapPin className="text-gray-400 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p className="text-sm">
                  {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}, {selectedSpace.zip_code}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Comodidades</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                {selectedSpace.wifi ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Wi-Fi</span>
              </div>
              <div className="flex items-center">
                {selectedSpace.parking ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Estacionamento</span>
              </div>
              <div className="flex items-center">
                {selectedSpace.sound_system ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Sistema de som</span>
              </div>
              <div className="flex items-center">
                {selectedSpace.air_conditioning ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Ar-condicionado</span>
              </div>
              <div className="flex items-center">
                {selectedSpace.kitchen ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Cozinha</span>
              </div>
              <div className="flex items-center">
                {selectedSpace.pool ? 
                  <Check size={16} className="text-green-500 mr-1" /> : 
                  <X size={16} className="text-red-500 mr-1" />
                }
                <span className="text-sm">Piscina</span>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="photos" className="mt-4">
          <Card className="p-4">
            {!sortedPhotoUrls || sortedPhotoUrls.length === 0 ? (
              <div className="text-center py-8">
                <Image size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Nenhuma foto ou vídeo disponível</p>
                <p className="text-xs text-gray-400 mt-1">
                  Verifique se as fotos/vídeos foram enviados corretamente
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedPhotoUrls.map((url, index) => {
                    const isVideoFile = isVideo(url);
                    console.log(`Rendering media ${index + 1} with URL:`, url, "isVideo:", isVideoFile);
                    return (
                      <div key={index} className="relative">
                        {isVideoFile ? (
                          <video
                            src={url}
                            controls
                            className="w-full h-40 object-cover rounded-md border"
                            preload="metadata"
                            onLoad={() => {
                              console.log(`✓ Vídeo ${index + 1} carregado com sucesso:`, url);
                            }}
                            onError={(e) => {
                              console.error(`✗ Erro ao carregar vídeo ${index + 1}:`, url);
                              console.error("Video error event:", e);
                            }}
                          >
                            Seu navegador não suporta vídeos.
                          </video>
                        ) : (
                          <img 
                            src={url} 
                            alt={`Espaço ${selectedSpace.name} ${index + 1}`}
                            className="w-full h-40 object-cover rounded-md border"
                            onLoad={() => {
                              console.log(`✓ Foto ${index + 1} carregada com sucesso:`, url);
                            }}
                            onError={(e) => {
                              console.error(`✗ Erro ao carregar foto ${index + 1}:`, url);
                              console.error("Image error event:", e);
                              // Fallback para uma imagem de placeholder
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gYW8gY2FycmVnYXIgaW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                        )}
                        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {index + 1}/{sortedPhotoUrls.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <h3 className="text-lg font-medium mt-4 text-center">{selectedSpace.name}</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  {sortedPhotoUrls.length} mídia{sortedPhotoUrls.length !== 1 ? 's' : ''} encontrada{sortedPhotoUrls.length !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="location" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Endereço Completo</h4>
                <p className="text-sm text-gray-600">
                  {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}
                </p>
                <p className="text-sm text-gray-600">CEP: {selectedSpace.zip_code}</p>
              </div>
              
              {selectedSpace.latitude && selectedSpace.longitude ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Mapa</h4>
                  <div className="h-[200px] bg-gray-100 rounded-md overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${selectedSpace.latitude},${selectedSpace.longitude}&zoom=15`}
                      allowFullScreen
                      title={`Localização de ${selectedSpace.name}`}
                    ></iframe>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Coordenadas: {selectedSpace.latitude}, {selectedSpace.longitude}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Coordenadas não definidas</p>
                  <p className="text-xs text-gray-400 mt-1">
                    O proprietário não definiu a localização exata no mapa
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedSpace.status === "pending" && (
        <div className="mt-6">
          <Card className="p-4">
            <Textarea
              placeholder="Motivo da rejeição (obrigatório para rejeitar)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
            
            <div className="flex justify-between mt-4">
              <Button 
                variant="destructive" 
                onClick={onReject}
              >
                <X size={16} className="mr-1" />
                Rejeitar
              </Button>
              
              <Button 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={onApprove}
              >
                <Check size={16} className="mr-1" />
                Aprovar
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {selectedSpace.status === "rejected" && (
        <Card className="mt-6 p-4 bg-red-50 border-red-200">
          <h4 className="font-medium text-red-700">Motivo da rejeição:</h4>
          <p className="text-red-600">{selectedSpace.rejection_reason || "Nenhum motivo fornecido"}</p>
        </Card>
      )}

      {/* Delete Space Button for Admins */}
      {isAdmin && (
        <div className="mt-6">
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={16} className="mr-1" />
            Excluir Espaço
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este espaço? Esta ação não pode ser desfeita.
              O proprietário será notificado sobre esta exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Textarea
            placeholder="Motivo da exclusão (obrigatório)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="resize-none mt-4"
            rows={3}
          />
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={deletingSpace}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSpace();
              }}
              disabled={deletingSpace}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingSpace ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpaceDetails;
