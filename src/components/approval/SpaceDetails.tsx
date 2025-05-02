
import React from "react";
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
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  return (
    <div className="mt-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">Fotos</TabsTrigger>
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
            {photoUrls.length === 0 ? (
              <div className="text-center py-8">
                <Image size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Nenhuma foto disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {photoUrls.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Espaço ${selectedSpace.name} ${index + 1}`}
                    className="w-full h-40 object-cover rounded-md"
                  />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="location" className="mt-4">
          <Card className="p-4">
            {selectedSpace.latitude && selectedSpace.longitude ? (
              <div className="h-[200px] bg-gray-100 rounded-md overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${selectedSpace.latitude},${selectedSpace.longitude}`}
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Localização não definida</p>
              </div>
            )}
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
    </div>
  );
};

export default SpaceDetails;
