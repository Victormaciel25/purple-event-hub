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
  Loader2,
  X,
  Maximize2,
  MessageSquare
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
import {
  Dialog,
  DialogContent,
  DialogClose
} from "@/components/ui/dialog";

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
  user_id?: string; // Adicionado para verificar o proprietário
};

const EventSpaceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [spaceOwner, setSpaceOwner] = useState<{ id: string, name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processingChat, setProcessingChat] = useState(false);
  
  useEffect(() => {
    // Obter o ID do usuário atual
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    getCurrentUser();
    
    if (id) {
      fetchSpaceDetails(id);
    }
  }, [id]);
  
  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      setLoading(true);
      
      // Fetch space details with user profile information
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      
      if (spaceError) {
        console.error("Error fetching space details:", spaceError);
        throw spaceError;
      }
      
      if (!spaceData) {
        console.error("No space data found");
        toast.error("Espaço não encontrado");
        navigate("/explore");
        return;
      }
      
      console.log("Space data fetched:", spaceData);
      
      // Now fetch the owner's profile information directly
      if (spaceData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", spaceData.user_id)
          .single();
          
        if (profileError) {
          console.error("Error fetching owner profile:", profileError);
          // Continue execution even if profile fetch fails
        }
        
        if (profileData) {
          const ownerName = profileData.first_name && profileData.last_name 
            ? `${profileData.first_name} ${profileData.last_name}` 
            : "Proprietário";
          
          setSpaceOwner({
            id: profileData.id,
            name: ownerName
          });
          
          console.log("Space owner set:", { id: profileData.id, name: ownerName });
        } else {
          // If no profile found, at least set the ID from space data
          setSpaceOwner({
            id: spaceData.user_id,
            name: "Proprietário"
          });
          console.log("Space owner set with default name:", { id: spaceData.user_id, name: "Proprietário" });
        }
      } else {
        console.error("Space has no user_id");
      }
      
      // Fetch photos related to this space
      const { data: photoData, error: photoError } = await supabase
        .from("space_photos")
        .select("storage_path")
        .eq("space_id", spaceId);
      
      if (photoError) {
        console.error("Error fetching photo data:", photoError);
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
        longitude: spaceData.longitude,
        user_id: spaceData.user_id
      };
      
      console.log("Space details created:", spaceDetails);
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
      // Clean the phone number to ensure it's in the correct format and add +55 prefix
      const cleanPhone = space.phone.replace(/\D/g, "");
      const phoneWithPrefix = `+55${cleanPhone}`;
      const whatsappUrl = `https://wa.me/${phoneWithPrefix}?text=${encodeURIComponent(message)}`;
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
  
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageDialogOpen(true);
  };
  
  const startChat = async () => {
    try {
      console.log("Starting chat with space:", space);
      console.log("Space owner:", spaceOwner);
      
      // Ensure space data is available
      if (!space) {
        console.error("Space data is missing");
        toast.error("Informações do espaço não disponíveis");
        return;
      }
      
      // Ensure space owner data is available
      if (!spaceOwner) {
        // If spaceOwner is not set but space.user_id exists, use it
        if (space.user_id) {
          setSpaceOwner({
            id: space.user_id,
            name: "Proprietário"
          });
          console.log("Set fallback space owner from user_id:", space.user_id);
        } else {
          console.error("Space owner data is missing and no fallback available");
          toast.error("Informações do proprietário não disponíveis");
          return;
        }
      }
      
      if (!spaceOwner.id) {
        console.error("Space owner ID is missing");
        toast.error("ID do proprietário não disponível");
        return;
      }
      
      setProcessingChat(true);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Auth error:", userError);
        throw userError;
      }
      
      if (!userData.user) {
        console.error("No user data");
        toast.error("Você precisa estar logado para enviar mensagens");
        navigate("/login");
        return;
      }

      // Verificando se o usuário atual é o proprietário do espaço
      if (userData.user.id === spaceOwner.id) {
        console.error("User is space owner");
        toast.error("Não é possível iniciar uma conversa consigo mesmo");
        return;
      }
      
      console.log("Checking for existing chats...");
      console.log("Parameters:", {
        current_user_id: userData.user.id,
        space_owner_id: spaceOwner.id,
        current_space_id: space.id
      });
      
      // Check if chat already exists
      const { data: existingChats, error: chatQueryError } = await supabase.functions
        .invoke('get_chat_by_users_and_space', { 
          body: JSON.stringify({ 
            current_user_id: userData.user.id,
            space_owner_id: spaceOwner.id,
            current_space_id: space.id 
          })
        });
      
      console.log("Existing chats response:", existingChats);
      
      if (chatQueryError) {
        console.error("Error checking for existing chats:", chatQueryError);
        throw chatQueryError;
      }
      
      let chatId;
      
      if (existingChats && Array.isArray(existingChats) && existingChats.length > 0) {
        chatId = existingChats[0].id;
        console.log("Using existing chat:", chatId);
        toast.info("Abrindo conversa existente");
      } else {
        console.log("Creating new chat...");
        // Create a new chat
        const { data: newChat, error: insertError } = await supabase
          .from("chats")
          .insert({
            user_id: userData.user.id,
            owner_id: spaceOwner.id,
            space_id: space.id,
            space_name: space.name,
            space_image: space.images[0] || null,
            last_message: "",
            last_message_time: new Date().toISOString()
          })
          .select("id")
          .single();
        
        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
        
        if (!newChat || !newChat.id) {
          console.error("No new chat created");
          throw new Error("Failed to create chat");
        }
        
        chatId = newChat.id;
        console.log("New chat created:", chatId);
        toast.success("Nova conversa iniciada");
      }
      
      // Modified: Navigate to messages page with the chat ID as a query parameter
      navigate(`/messages?chat=${chatId}`);
    } catch (error: any) {
      console.error("Error starting chat:", error);
      toast.error("Não foi possível iniciar a conversa: " + (error.message || "Erro desconhecido"));
    } finally {
      setProcessingChat(false);
    }
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
        <div className="flex items-center flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-2 flex-shrink-0">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold truncate" title={space.name}>{space.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={startChat}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Enviar mensagem"
            disabled={currentUserId === spaceOwner?.id || processingChat}
          >
            <MessageSquare size={24} className={currentUserId === spaceOwner?.id ? "text-gray-300" : "text-iparty"} />
          </Button>
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
      </div>
      
      {/* Carrossel de imagens */}
      <div className="mb-6">
        <Carousel className="w-full">
          <CarouselContent>
            {space.images.map((image, index) => (
              <CarouselItem key={index} className="md:basis-auto">
                <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden relative group">
                  <img 
                    src={image} 
                    alt={`${space.name} - Imagem ${index + 1}`} 
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleImageClick(image)}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {index + 1}/{space.images.length}
                    </span>
                    <button 
                      className="bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleImageClick(image)}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 bg-white/70" />
          <CarouselNext className="right-2 bg-white/70" />
        </Carousel>
      </div>
      
      {/* Dialog para visualizar imagem ampliada */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-screen-lg w-[95vw] h-[90vh] p-0 bg-black/95 border-none">
          <div className="flex items-center justify-center w-full h-full relative">
            <img 
              src={selectedImage || ''} 
              alt="Visualização ampliada" 
              className="max-w-full max-h-full object-contain"
            />
            <DialogClose className="absolute top-4 right-4 bg-black/50 rounded-full p-1 hover:bg-black/70">
              <X className="h-6 w-6 text-white" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      
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
      
      {/* Botões de contato */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="w-full bg-green-600 hover:bg-green-700" 
          size="lg"
          onClick={handleWhatsAppContact}
        >
          <Phone size={18} className="mr-2" />
          WhatsApp
        </Button>
        
        <Button 
          className="w-full bg-iparty hover:bg-iparty-dark" 
          size="lg"
          onClick={startChat}
          disabled={currentUserId === spaceOwner?.id || processingChat}
        >
          {processingChat ? (
            <Loader2 size={18} className="mr-2 animate-spin" />
          ) : (
            <MessageSquare size={18} className="mr-2" />
          )}
          Mensagem
        </Button>
      </div>
    </div>
  );
};

export default EventSpaceDetails;
