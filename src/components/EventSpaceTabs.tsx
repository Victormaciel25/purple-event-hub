import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Phone, 
  Wifi, 
  ParkingMeter, 
  Speaker, 
  AirVent, 
  Utensils, 
  Waves,
  MessageSquare,
  Trash2,
  MapPin,
  Instagram,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';
import { BookingTab } from './booking/BookingTab';

interface SpaceDetails {
  id: string;
  name: string;
  address: string;
  number: string;
  state: string;
  zip_code: string;
  description: string;
  price: string;
  capacity: string;
  phone: string;
  instagram?: string;
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
  latitude?: number;
  longitude?: number;
  user_id?: string;
}

interface EventSpaceTabsProps {
  space: SpaceDetails;
  currentUserId: string | null;
  spaceOwner: { id: string; name: string } | null;
  isAdmin: boolean;
  processingChat: boolean;
  onWhatsApp: () => void;
  onStartChat: () => void;
  onDeleteSpace: () => void;
  formatPrice: (price: string) => string;
}

export const EventSpaceTabs: React.FC<EventSpaceTabsProps> = ({
  space,
  currentUserId,
  spaceOwner,
  isAdmin,
  processingChat,
  onWhatsApp,
  onStartChat,
  onDeleteSpace,
  formatPrice,
}) => {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Detalhes
        </TabsTrigger>
        <TabsTrigger value="booking" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Agenda
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-6 space-y-6">
        {/* Title and Instagram */}
        <div>
          <h1 className="text-2xl font-bold mb-2 truncate">{space.name}</h1>
          {space.instagram && (
            <a 
              href={space.instagram.startsWith('http') ? space.instagram : `https://instagram.com/${space.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 mb-2 block flex items-center"
            >
              <Instagram className="mr-1 text-primary" size={16} />
              {space.instagram.startsWith('@') ? space.instagram : `@${space.instagram}`}
            </a>
          )}
        </div>

        {/* Price and Capacity */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">A partir de</p>
                <h2 className="text-xl font-bold">{formatPrice(space.price)}</h2>
              </div>
              <Badge variant="secondary">
                <Users className="mr-1" size={14} />
                Até {space.capacity} pessoas
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {space.address}, {space.number} – {space.state}
            </p>
            <p className="text-muted-foreground">CEP: {space.zip_code}</p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">Sobre o espaço</h3>
            <p className="text-muted-foreground">{space.description}</p>
          </CardContent>
        </Card>

        {/* Location Map */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <MapPin className="mr-2" size={20} />
              Localização
            </h3>
            {space.latitude && space.longitude ? (
              <div>
                <div className="h-[200px] bg-muted rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${space.latitude},${space.longitude}&zoom=15`}
                    allowFullScreen
                    title={`Localização de ${space.name}`}
                  ></iframe>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  📍 {space.address}, {space.number} - {space.state}
                </p>
              </div>
            ) : (
              <div className="h-[120px] bg-muted rounded-lg border border-dashed flex flex-col items-center justify-center">
                <MapPin size={32} className="text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Localização não definida no mapa</p>
                <p className="text-xs text-muted-foreground mt-1">
                  📍 {space.address}, {space.number} - {space.state}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">Comodidades</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`flex items-center ${space.parking ? "" : "text-muted-foreground/50"}`}>
                <ParkingMeter className="mr-2" size={18} />
                <span>{space.parking ? "Estacionamento" : "Sem estacionamento"}</span>
              </div>
              <div className={`flex items-center ${space.wifi ? "" : "text-muted-foreground/50"}`}>
                <Wifi className="mr-2" size={18} />
                <span>{space.wifi ? "Wi-Fi" : "Sem Wi-Fi"}</span>
              </div>
              <div className={`flex items-center ${space.sound_system ? "" : "text-muted-foreground/50"}`}>
                <Speaker className="mr-2" size={18} />
                <span>{space.sound_system ? "Sistema de som" : "Sem sistema de som"}</span>
              </div>
              <div className={`flex items-center ${space.air_conditioning ? "" : "text-muted-foreground/50"}`}>
                <AirVent className="mr-2" size={18} />
                <span>{space.air_conditioning ? "Ar condicionado" : "Sem ar condicionado"}</span>
              </div>
              <div className={`flex items-center ${space.kitchen ? "" : "text-muted-foreground/50"}`}>
                <Utensils className="mr-2" size={18} />
                <span>{space.kitchen ? "Cozinha" : "Sem cozinha"}</span>
              </div>
              <div className={`flex items-center ${space.pool ? "" : "text-muted-foreground/50"}`}>
                <Waves className="mr-2" size={18} />
                <span>{space.pool ? "Piscina" : "Sem piscina"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-green-600 hover:bg-green-700" size="lg" onClick={onWhatsApp}>
            <Phone className="mr-2" size={18} />
            Contato
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={onStartChat}
            disabled={currentUserId === spaceOwner?.id || processingChat}
          >
            {processingChat ? (
              <Loader2 className="mr-2 animate-spin" size={18} />
            ) : (
              <MessageSquare className="mr-2" size={18} />
            )}
            Mensagem
          </Button>
        </div>

        {/* Delete Button for Admin */}
        {isAdmin && (
          <Button
            variant="destructive"
            className="w-full"
            size="lg"
            onClick={onDeleteSpace}
          >
            <Trash2 className="mr-2" size={18} />
            Excluir Espaço
          </Button>
        )}
      </TabsContent>

      <TabsContent value="booking" className="mt-6">
        <BookingTab
          spaceId={space.id}
          spaceName={space.name}
        />
      </TabsContent>
    </Tabs>
  );
};