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
  MessageSquare,
  Trash2,
  ZoomIn
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
import { Textarea } from "@/components/ui/textarea";
import { useUserRoles } from "@/hooks/useUserRoles";
import OptimizedImage from "@/components/OptimizedImage";
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
  user_id?: string;
};

const EventSpaceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  const { isAdmin } = useUserRoles();

  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [spaceOwner, setSpaceOwner] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processingChat, setProcessingChat] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingSpace, setDeletingSpace] = useState(false);

  useEffect(() => {
    // Pega ID do usuário
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setCurrentUserId(data.user.id);
    })();
    if (id) fetchSpaceDetails(id);
  }, [id]);

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      setLoading(true);
      // Busca dados do espaço
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      if (spaceError) throw spaceError;
      if (!spaceData) {
        toast.error("Espaço não encontrado");
        navigate("/explore");
        return;
      }
      // Busca profile do dono
      if (spaceData.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", spaceData.user_id)
          .single();
        if (profileData) {
          const name = profileData.first_name && profileData.last_name
            ? `${profileData.first_name} ${profileData.last_name}`
            : "Proprietário";
          setSpaceOwner({ id: profileData.id, name });
        } else {
          setSpaceOwner({ id: spaceData.user_id, name: "Proprietário" });
        }
      }
      // Busca fotos
      const { data: photoData } = await supabase
        .from("space_photos")
        .select("storage_path")
        .eq("space_id", spaceId);
      const urls: string[] = [];
      if (photoData?.length) {
        for (const p of photoData) {
          const { data: urlData } = await supabase.storage
            .from("spaces")
            .createSignedUrl(p.storage_path, 3600);
          if (urlData) urls.push(urlData.signedUrl);
        }
      }
      if (!urls.length) urls.push("https://source.unsplash.com/random/600x400?event");

      setImageUrls(urls);
      setSpace({
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
        parking: spaceData.parking,
        wifi: spaceData.wifi,
        sound_system: spaceData.sound_system,
        air_conditioning: spaceData.air_conditioning,
        kitchen: spaceData.kitchen,
        pool: spaceData.pool,
        images: urls,
        latitude: spaceData.latitude,
        longitude: spaceData.longitude,
        user_id: spaceData.user_id,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar detalhes do espaço");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    if (!space) return;
    const clean = space.phone.replace(/\D/g, "");
    const url = `https://wa.me/+55${clean}?text=${encodeURIComponent(
      `Olá, estou interessado no espaço ${space.name}`
    )}`;
    window.open(url, "_blank");
  };

  const startChat = async () => {
    if (!space || !spaceOwner) return;
    if (currentUserId === spaceOwner.id) {
      toast.error("Não é possível iniciar conversa consigo mesmo");
      return;
    }
    setProcessingChat(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Faça login para enviar mensagens");
        navigate("/login");
        return;
      }
      // Checa conversa existente via edge function
      const { data: existing, error: qErr } = await supabase.functions.invoke(
        "get_chat_by_users_and_space",
        {
          body: JSON.stringify({
            current_user_id: userData.user.id,
            space_owner_id: spaceOwner.id,
            current_space_id: space.id,
          }),
        }
      );
      let chatId: string;
      if (!qErr && Array.isArray(existing) && existing.length > 0) {
        chatId = existing[0].id;
      } else {
        const { data: newChat } = await supabase
          .from("chats")
          .insert({
            user_id: userData.user.id,
            owner_id: spaceOwner.id,
            space_id: space.id,
            space_name: space.name,
            space_image: space.images[0] || null,
            last_message: "",
            last_message_time: new Date().toISOString(),
          })
          .select("id")
          .single();
        chatId = newChat!.id;
      }
      navigate("/messages", { state: { chatId } });
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível iniciar a conversa");
    } finally {
      setProcessingChat(false);
    }
  };

  const formatPrice = (value: string) =>
    parseFloat(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    setIsImageDialogOpen(true);
  };

  const handleDeleteSpace = async () => {
    if (!deleteReason.trim()) {
      toast.error("Preencha o motivo da exclusão");
      return;
    }
    setDeletingSpace(true);
    try {
      if (space && space.user_id) {
        await supabase.from("space_deletion_notifications").insert({
          user_id: space.user_id,
          space_name: space.name,
          deletion_reason: deleteReason,
        });
      }
      await supabase.functions.invoke("delete_space_with_photos", {
        body: JSON.stringify({ space_id: space!.id }),
      });
      toast.success("Espaço excluído com sucesso");
      setDeleteDialogOpen(false);
      navigate("/explore");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir espaço");
    } finally {
      setDeletingSpace(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 flex items-center justify-center h-[70vh]">
        <Loader2 className="animate-spin text-iparty h-8 w-8" />
      </div>
    );
  }
  if (!space) {
    return (
      <div className="container px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft />
        </Button>
        <p>Espaço não encontrado</p>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 pb-20 mx-auto">
      {/* Voltar */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </Button>
      </div>

      {/* Carrossel */}
      <div className="mb-6">
        <Carousel>
          <CarouselContent>
            {space.images.map((img, idx) => (
              <CarouselItem key={idx}>
                <div className="relative group rounded-lg overflow-hidden h-64 md:h-80">
                  <OptimizedImage
                    src={img}
                    alt={`${space.name} ${idx + 1}`}
                    className="object-cover w-full h-full cursor-pointer"
                    onClick={() => handleImageClick(img)}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {idx + 1}/{space.images.length}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 bg-black/70 p-1 rounded text-white"
                      onClick={() => handleImageClick(img)}
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="bg-white/70 left-2" />
          <CarouselNext className="bg-white/70 right-2" />
        </Carousel>
      </div>

      {/* **Título abaixo da imagem** */}
      <h1 className="text-2xl font-bold mb-6 truncate" title={space.name}>
        {space.name}
      </h1>

      {/* Preço e endereço */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">{formatPrice(space.price)}</h2>
          <Badge variant="secondary">
            <Users className="mr-1" size={14} />
            Até {space.capacity} pessoas
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {space.address}, {space.number} – {space.state}
        </p>
        <p className="text-muted-foreground">CEP: {space.zip_code}</p>
      </div>

      {/* Sobre */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Sobre o espaço</h3>
        <p className="text-muted-foreground">{space.description}</p>
      </div>

      {/* Comodidades */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Comodidades</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={space.parking ? "" : "text-muted-foreground/50"}>
            <ParkingMeter className="mr-2" size={18} />
            {space.parking ? "Estacionamento" : "Sem estacionamento"}
          </div>
          <div className={space.wifi ? "" : "text-muted-foreground/50"}>
            <Wifi className="mr-2" size={18} />
            {space.wifi ? "Wi-Fi" : "Sem Wi-Fi"}
          </div>
          <div className={space.sound_system ? "" : "text-muted-foreground/50"}>
            <Speaker className="mr-2" size={18} />
            {space.sound_system ? "Sistema de som" : "Sem sistema de som"}
          </div>
          <div className={space.air_conditioning ? "" : "text-muted-foreground/50"}>
            <AirVent className="mr-2" size={18} />
            {space.air_conditioning ? "Ar condicionado" : "Sem ar condicionado"}
          </div>
          <div className={space.kitchen ? "" : "text-muted-foreground/50"}>
            <Utensils className="mr-2" size={18} />
            {space.kitchen ? "Cozinha" : "Sem cozinha"}
          </div>
          <div className={space.pool ? "" : "text-muted-foreground/50"}>
            <Waves className="mr-2" size={18} />
            {space.pool ? "Piscina" : "Sem piscina"}
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button
          className="bg-green-600 hover:bg-green-700"
          size="lg"
          onClick={handleWhatsAppContact}
        >
          <Phone className="mr-2" size={18} />
          WhatsApp
        </Button>
        <Button
          className="bg-iparty hover:bg-iparty-dark"
          size="lg"
          onClick={startChat}
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

      {/* Favorito */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => toggleFavorite(space.id)}
          className="flex items-center"
        >
          <Heart
            className={isFavorite(space.id) ? "fill-red-500 text-red-500" : "text-gray-500"}
            size={24}
          />
          <span className="ml-2">
            {isFavorite(space.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </span>
        </Button>
      </div>

      {/* Botão de excluir para admins */}
      {isAdmin && (
        <Button
          variant="destructive"
          className="w-full mb-6"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="mr-2" size={18} />
          Excluir Espaço
        </Button>
      )}

      {/* Dialog de visualização de imagem */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-screen-lg w-[95vw] h-[90vh] p-0 bg-black/95 border-none">
          <div className="flex items-center justify-center w-full h-full relative">
            <OptimizedImage
              src={selectedImage || ""}
              alt="Visualização ampliada"
              className="max-w-full max-h-full object-contain"
            />
            <DialogClose className="absolute top-4 right-4 bg-black/50 rounded-full p-1 hover:bg-black/70">
              <X className="h-6 w-6 text-white" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este espaço? Esta ação não pode ser desfeita.
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
            <AlertDialogCancel disabled={deletingSpace}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteSpace()}
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

export default EventSpaceDetails;
