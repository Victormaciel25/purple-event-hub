import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Phone, Wifi, ParkingMeter, Speaker, AirVent, Utensils, Waves, Users, Heart } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";

// Dados de exemplo para os espaços de eventos
const eventSpaces = [
  {
    id: "1",
    name: "Espaço Vila Garden",
    address: "Rua das Flores, 123 - São Paulo",
    price: 3500,
    whatsapp: "5511999999999",
    description: "Um lindo espaço para eventos ao ar livre com jardins bem cuidados e ampla área para celebrações.",
    capacity: 250,
    images: [
      "https://source.unsplash.com/photo-1473177104440-ffee2f376098",
      "https://source.unsplash.com/photo-1487958449943-2429e8be8625",
      "https://source.unsplash.com/photo-1496307653780-42ee777d4833",
    ],
    amenities: {
      parking: true,
      wifi: true,
      soundSystem: true,
      airConditioning: true,
      kitchen: true,
      pool: false,
    }
  },
  {
    id: "2",
    name: "Salão Golden Hall",
    address: "Av. Paulista, 1000 - São Paulo",
    price: 5000,
    whatsapp: "5511888888888",
    description: "Salão elegante e sofisticado, ideal para casamentos e eventos corporativos de grande porte.",
    capacity: 400,
    images: [
      "https://source.unsplash.com/photo-1487958449943-2429e8be8625",
      "https://source.unsplash.com/photo-1473177104440-ffee2f376098",
      "https://source.unsplash.com/photo-1721322800607-8c38375eef04",
    ],
    amenities: {
      parking: true,
      wifi: true,
      soundSystem: true,
      airConditioning: true,
      kitchen: true,
      pool: false,
    }
  },
  {
    id: "3",
    name: "Alameda Jardins",
    address: "Alameda Santos, 500 - São Paulo",
    price: 4200,
    whatsapp: "5511777777777",
    description: "Espaço contemporâneo com ambientes internos e externos, perfeito para eventos sociais e corporativos.",
    capacity: 300,
    images: [
      "https://source.unsplash.com/photo-1496307653780-42ee777d4833",
      "https://source.unsplash.com/photo-1487958449943-2429e8be8625",
      "https://source.unsplash.com/photo-1473177104440-ffee2f376098",
    ],
    amenities: {
      parking: true,
      wifi: true,
      soundSystem: true,
      airConditioning: true,
      kitchen: false,
      pool: true,
    }
  },
  {
    id: "4",
    name: "Casa de Festas Luminária",
    address: "Rua Augusta, 789 - São Paulo",
    price: 3800,
    whatsapp: "5511666666666",
    description: "Ambiente acolhedor e bem iluminado, ideal para festas de aniversário e pequenas celebrações.",
    capacity: 150,
    images: [
      "https://source.unsplash.com/photo-1721322800607-8c38375eef04",
      "https://source.unsplash.com/photo-1496307653780-42ee777d4833",
      "https://source.unsplash.com/photo-1487958449943-2429e8be8625",
    ],
    amenities: {
      parking: false,
      wifi: true,
      soundSystem: true,
      airConditioning: false,
      kitchen: true,
      pool: false,
    }
  },
];

const EventSpaceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  
  const eventSpace = eventSpaces.find(space => space.id === id);
  
  if (!eventSpace) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Espaço não encontrado</h1>
        </div>
        <p>O espaço solicitado não foi encontrado.</p>
      </div>
    );
  }
  
  const handleWhatsAppContact = () => {
    const message = `Olá, estou interessado no espaço ${eventSpace.name} para um evento`;
    const whatsappUrl = `https://wa.me/${eventSpace.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <div className="container px-4 py-6 pb-20 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold truncate">{eventSpace.name}</h1>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => toggleFavorite(eventSpace.id)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Heart 
            size={24} 
            className={isFavorite(eventSpace.id) ? "fill-red-500 text-red-500" : "text-gray-500"} 
          />
        </Button>
      </div>
      
      {/* Carrossel de imagens */}
      <div className="mb-6">
        <Carousel className="w-full">
          <CarouselContent>
            {eventSpace.images.map((image, index) => (
              <CarouselItem key={index} className="md:basis-auto">
                <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden">
                  <img 
                    src={image} 
                    alt={`${eventSpace.name} - Imagem ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 bg-white/70" />
          <CarouselNext className="right-2 bg-white/70" />
        </Carousel>
      </div>
      
      {/* Preço e endereço */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">R$ {eventSpace.price}</h2>
          <Badge variant="secondary">
            <Users size={14} className="mr-1" />
            Até {eventSpace.capacity} pessoas
          </Badge>
        </div>
        <p className="text-muted-foreground">{eventSpace.address}</p>
      </div>
      
      {/* Descrição */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Sobre o espaço</h3>
        <p className="text-muted-foreground">{eventSpace.description}</p>
      </div>
      
      {/* Comodidades */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Comodidades</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`flex items-center ${eventSpace.amenities.parking ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <ParkingMeter size={18} className="mr-2" />
            <span>{eventSpace.amenities.parking ? 'Estacionamento' : 'Sem estacionamento'}</span>
          </div>
          <div className={`flex items-center ${eventSpace.amenities.wifi ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Wifi size={18} className="mr-2" />
            <span>{eventSpace.amenities.wifi ? 'Wi-Fi' : 'Sem Wi-Fi'}</span>
          </div>
          <div className={`flex items-center ${eventSpace.amenities.soundSystem ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Speaker size={18} className="mr-2" />
            <span>{eventSpace.amenities.soundSystem ? 'Sistema de som' : 'Sem sistema de som'}</span>
          </div>
          <div className={`flex items-center ${eventSpace.amenities.airConditioning ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <AirVent size={18} className="mr-2" />
            <span>{eventSpace.amenities.airConditioning ? 'Ar condicionado' : 'Sem ar condicionado'}</span>
          </div>
          <div className={`flex items-center ${eventSpace.amenities.kitchen ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Utensils size={18} className="mr-2" />
            <span>{eventSpace.amenities.kitchen ? 'Cozinha' : 'Sem cozinha'}</span>
          </div>
          <div className={`flex items-center ${eventSpace.amenities.pool ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Waves size={18} className="mr-2" />
            <span>{eventSpace.amenities.pool ? 'Piscina' : 'Sem piscina'}</span>
          </div>
        </div>
      </div>
      
      {/* Botão de contato */}
      <Button 
        className="w-full bg-green-600 hover:bg-green-700" 
        size="lg"
        onClick={handleWhatsAppContact}
      >
        <Phone size={18} className="mr-2" />
        Contatar via WhatsApp
      </Button>
    </div>
  );
};

export default EventSpaceDetails;
