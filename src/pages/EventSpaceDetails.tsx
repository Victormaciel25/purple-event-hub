
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Phone, 
  Wifi, 
  ParkingMeter, 
  Speaker, 
  AirVent, 
  Utensils, 
  Waves, 
  Users, 
  Heart, 
  Loader2 
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define a type for the space details with all the fields
type SpaceDetails = {
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
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
  images: string[];
  latitude?: number;
  longitude?: number;
};

const EventSpaceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  useEffect(() => {
    if (id) {
      fetchSpaceDetails(id);
    }
  }, [id]);
  
  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      setLoading(true);
      
      // Fetch space details
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      
      if (spaceError) {
        throw spaceError;
      }
      
      if (!spaceData) {
        toast.error("Espaço não encontrado");
        navigate("/explore");
        return;
      }
      
      // Fetch photos related to this space
      const { data: photoData, error: photoError } = await supabase
        .from("space_photos")
        .select("storage_path")
        .eq("space_id", spaceId);
      
      if (photoError) {
        throw photoError;
      }
      
      // Get signed URLs for all photos
      const photos = photoData || [];
      const urls: string[] = [];
      
      if (photos.length > 0) {
        for (const photo of photos) {
          const { data: urlData } = await supabase.storage
            .from('spaces')
            .createSignedUrl(photo.storage_path, 3600);
            
          if (urlData) {
            urls.push(urlData.signedUrl);
          }
        }
      } 
      
      // Use default image if no images were found
      if (urls.length === 0) {
        urls.push("https://source.unsplash.com/random/600x400?event");
      }
      
      // Create the space details object
      const spaceDetails: SpaceDetails = {
        id: spaceData.id,
        name: spaceData.name,
        address: spaceData.address,
        number: spaceData.number,
        state: spaceData.state,
        zip_code: spaceData.zip_code,
        description: spaceData.description,
        price: spaceData.price,
        capacity: spaceData.capacity,
        phone: spaceData.phone,
        parking: spaceData.parking || false,
        wifi: spaceData.wifi || false,
        sound_system: spaceData.sound_system || false,
        air_conditioning: spaceData.air_conditioning || false,
        kitchen: spaceData.kitchen || false,
        pool: spaceData.pool || false,
        images: urls,
        latitude: spaceData.latitude,
        longitude: spaceData.longitude
      };
      
      setSpace(spaceDetails);
      setImageUrls(urls);
      
    } catch (error) {
      console.error("Error fetching space details:", error);
      toast.error("Erro ao carregar detalhes do espaço");
    } finally {
      setLoading(false);
    }
  };
  
  const handleWhatsAppContact = () => {
    if (space) {
      const message = `Olá, estou interessado no espaço ${space.name} para um evento`;
      // Clean the phone number to ensure it's in the correct format
      const cleanPhone = space.phone.replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };
  
  // Format price as Brazilian currency
  const formatPrice = (value: string) => {
    const numValue = parseFloat(value);
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  if (loading) {
    return (
      <div className="container px-4 py-6 flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <p className="mt-4 text-muted-foreground">Carregando detalhes do espaço...</p>
      </div>
    );
  }
  
  if (!space) {
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
  
  return (
    <div className="container px-4 py-6 pb-20 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold truncate">{space.name}</h1>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => toggleFavorite(space.id)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Heart 
            size={24} 
            className={isFavorite(space.id) ? "fill-red-500 text-red-500" : "text-gray-500"} 
          />
        </Button>
      </div>
      
      {/* Carrossel de imagens */}
      <div className="mb-6">
        <Carousel className="w-full">
          <CarouselContent>
            {space.images.map((image, index) => (
              <CarouselItem key={index} className="md:basis-auto">
                <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden">
                  <img 
                    src={image} 
                    alt={`${space.name} - Imagem ${index + 1}`} 
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
          <h2 className="text-2xl font-bold">{formatPrice(space.price)}</h2>
          <Badge variant="secondary">
            <Users size={14} className="mr-1" />
            Até {space.capacity} pessoas
          </Badge>
        </div>
        <p className="text-muted-foreground">{space.address}, {space.number} - {space.state}</p>
        <p className="text-muted-foreground">CEP: {space.zip_code}</p>
      </div>
      
      {/* Descrição */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Sobre o espaço</h3>
        <p className="text-muted-foreground">{space.description}</p>
      </div>
      
      {/* Comodidades */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Comodidades</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`flex items-center ${space.parking ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <ParkingMeter size={18} className="mr-2" />
            <span>{space.parking ? 'Estacionamento' : 'Sem estacionamento'}</span>
          </div>
          <div className={`flex items-center ${space.wifi ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Wifi size={18} className="mr-2" />
            <span>{space.wifi ? 'Wi-Fi' : 'Sem Wi-Fi'}</span>
          </div>
          <div className={`flex items-center ${space.sound_system ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Speaker size={18} className="mr-2" />
            <span>{space.sound_system ? 'Sistema de som' : 'Sem sistema de som'}</span>
          </div>
          <div className={`flex items-center ${space.air_conditioning ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <AirVent size={18} className="mr-2" />
            <span>{space.air_conditioning ? 'Ar condicionado' : 'Sem ar condicionado'}</span>
          </div>
          <div className={`flex items-center ${space.kitchen ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Utensils size={18} className="mr-2" />
            <span>{space.kitchen ? 'Cozinha' : 'Sem cozinha'}</span>
          </div>
          <div className={`flex items-center ${space.pool ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            <Waves size={18} className="mr-2" />
            <span>{space.pool ? 'Piscina' : 'Sem piscina'}</span>
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
