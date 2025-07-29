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
  MessageSquare,
  Trash2,
  MoreVertical,
  Share,
  Flag,
  MapPin
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import { useUserSpacePhotos } from "../hooks/useUserSpacePhotos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useUserRoles } from "@/hooks/useUserRoles";
import OptimizedImage from "@/components/OptimizedImage";
import ImageViewer from "@/components/ImageViewer";
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
import ReportForm from "@/components/ReportForm";
import { SUPABASE_CONFIG } from "@/config/app-config";
import { Card } from "@/components/ui/card";

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
  latitude?: number;
  longitude?: number;
  user_id?: string;
};

const EventSpaceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useEventSpaceFavorites();
  const { isAdmin } = useUserRoles();
  
  // Usar o hook useUserSpacePhotos para buscar as fotos (funciona para todos os usuários)
  const { photos, photoUrls, loading: photosLoading } = useUserSpacePhotos(id || null);

  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [spaceOwner, setSpaceOwner] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processingChat, setProcessingChat] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingSpace, setDeletingSpace] = useState(false);

  // State for image viewer
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setCurrentUserId(data.user.id);
    })();
    if (id) fetchSpaceDetails(id);
  }, [id]);

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      setLoading(true);
      console.log("🔍 SPACE_DETAILS: Buscando detalhes do espaço:", spaceId);
      
      const { data: sd, error: se } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      
      if (se || !sd) {
        console.error("❌ SPACE_DETAILS: Erro ao buscar espaço:", se);
        throw se || new Error("Not found");
      }
      
      console.log("✅ SPACE_DETAILS: Espaço encontrado:", sd.name);
      
      if (sd.user_id) {
        const { data: pd } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", sd.user_id)
          .single();
        if (pd) setSpaceOwner({
          id: pd.id,
          name: pd.first_name && pd.last_name
            ? `${pd.first_name} ${pd.last_name}`
            : "Proprietário"
        });
        else setSpaceOwner({ id: sd.user_id, name: "Proprietário" });
      }
      
      setSpace(sd);
    } catch (err) {
      console.error("❌ SPACE_DETAILS: Erro ao carregar detalhes:", err);
      toast.error("Erro ao carregar detalhes");
      navigate("/explore");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (v: string) =>
    parseFloat(v).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const handleWhatsApp = () => {
    if (!space) return;
    const phone = space.phone.replace(/\D/g, "");
    window.open(
      `https://wa.me/+55${phone}?text=${encodeURIComponent(
        `Olá, tenho interesse no espaço ${space.name}`
      )}`,
      "_blank"
    );
  };

  const startChat = async () => {
    if (!space || !spaceOwner) return;
    if (currentUserId === spaceOwner.id) {
      toast.error("Não pode conversar consigo mesmo");
      return;
    }
    setProcessingChat(true);
    try {
      const { data: ud } = await supabase.auth.getUser();
      if (!ud.user) {
        toast.error("Faça login");
        navigate("/login");
        return;
      }
      const { data: exist } = await supabase.functions.invoke(
        "get_chat_by_users_and_space",
        {
          body: JSON.stringify({
            current_user_id: ud.user.id,
            space_owner_id: spaceOwner.id,
            current_space_id: space.id,
          }),
        }
      );
      let chatId: string;
      if (Array.isArray(exist) && exist.length) {
        chatId = exist[0].id;
      } else {
        const { data: nc } = await supabase
          .from("chats")
          .insert({
            user_id: ud.user.id,
            owner_id: spaceOwner.id,
            space_id: space.id,
            space_name: space.name,
            space_image: photoUrls[0] || null,
            last_message: "",
            last_message_time: new Date().toISOString(),
          })
          .select("id")
          .single();
        chatId = nc!.id;
      }
      navigate("/messages", { state: { chatId } });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao iniciar conversa");
    } finally {
      setProcessingChat(false);
    }
  };

  const handleShare = () => {
    if (!space) return;
    
    const url = window.location.href;
    const priceFormatted = formatPrice(space.price);
    const text = `Confira este espaço incrível: ${space.name} - ${priceFormatted} para até ${space.capacity} pessoas`;
    
    if (navigator.share) {
      navigator.share({
        title: `${space.name} - iParty`,
        text: text,
        url: url,
      }).catch(console.error);
    } else {
      const shareText = `${text}\n\nLocalização: ${space.address}, ${space.number} - ${space.state}\n\nAcesse: ${url}`;
      
      navigator.clipboard.writeText(shareText).then(() => {
        toast.success("Link copiado para a área de transferência!");
      }).catch(() => {
        toast.error("Erro ao copiar link");
      });
    }
  };

  const handleReport = () => {
    setReportFormOpen(true);
  };

  // Handler for vendor deletion
  const handleDeleteSpace = async () => {
    if (!deleteReason.trim()) {
      toast.error("Por favor, forneça um motivo para a exclusão");
      return;
    }

    try {
      setDeletingSpace(true);
      
      // Call the updated edge function that sends email notifications
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/delete_space_with_notification`;
      
      console.log("Calling edge function for space deletion:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify({ 
          space_id: space?.id,
          deletion_reason: deleteReason
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
        throw new Error(result.error || "Failed to delete space");
      }

      toast.success("Espaço excluído com sucesso e notificação enviada");
      navigate('/explore');
    } catch (error) {
      console.error("Error deleting space:", error);
      toast.error("Erro ao excluir espaço");
    } finally {
      setDeletingSpace(false);
      setDeleteDialogOpen(false);
    }
  };

  // Determinar quais imagens exibir
  console.log("🖼️ SPACE_DETAILS: Estado das fotos:", {
    photosLoading,
    photoUrlsLength: photoUrls?.length || 0,
    photoUrls: photoUrls?.slice(0, 2) // Log apenas as primeiras 2 URLs para debug
  });

  const displayImages = photoUrls && photoUrls.length > 0 
    ? photoUrls 
    : ["https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop"];

  if (loading || !space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin text-primary h-6 w-6" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-muted/50">
              <ChevronLeft size={20} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <MoreVertical size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => toggleFavorite(space.id)}>
                  <Heart
                    size={16}
                    className={`mr-2 ${isFavorite(space.id) ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                  />
                  {isFavorite(space.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share size={16} className="mr-2" />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport}>
                  <Flag size={16} className="mr-2" />
                  Denunciar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-20">
          {/* Images */}
          <div className="py-4">
            {photosLoading ? (
              <div className="h-80 bg-muted rounded-xl flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando fotos...</span>
                </div>
              </div>
            ) : (
              <Carousel>
                <CarouselContent>
                  {displayImages.map((image, i) => (
                    <CarouselItem key={i}>
                      <div 
                        className="relative h-80 rounded-xl overflow-hidden cursor-pointer group" 
                        onClick={() => handleImageClick(i)}
                      >
                        <OptimizedImage
                          src={image}
                          alt={`${space.name} ${i + 1}`}
                          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-3 right-3">
                          <Badge variant="secondary" className="bg-black/50 text-white border-0 backdrop-blur-sm">
                            {i + 1}/{displayImages.length}
                          </Badge>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            )}
          </div>

          {/* Title & Basic Info */}
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{space.name}</h1>
              <p className="text-muted-foreground">
                {space.address}, {space.number} – {space.state} • CEP: {space.zip_code}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">A partir de {formatPrice(space.price)}</div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users size={14} />
                Até {space.capacity} pessoas
              </Badge>
            </div>
          </div>

          {/* Description */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Sobre o espaço</h2>
            <p className="text-muted-foreground leading-relaxed">{space.description}</p>
          </Card>

          {/* Location */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Localização
            </h2>
            {space.latitude && space.longitude ? (
              <div className="space-y-3">
                <div className="h-48 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${space.latitude},${space.longitude}&zoom=15`}
                    allowFullScreen
                    title={`Localização de ${space.name}`}
                    className="grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  📍 {space.address}, {space.number} - {space.state}
                </p>
              </div>
            ) : (
              <div className="h-32 bg-muted rounded-lg flex flex-col items-center justify-center text-center">
                <MapPin size={24} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Localização não definida no mapa</p>
                <p className="text-xs text-muted-foreground">
                  📍 {space.address}, {space.number} - {space.state}
                </p>
              </div>
            )}
          </Card>

          {/* Amenities */}
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Comodidades</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: ParkingMeter, label: "Estacionamento", available: space.parking },
                { icon: Wifi, label: "Wi-Fi", available: space.wifi },
                { icon: Speaker, label: "Sistema de som", available: space.sound_system },
                { icon: AirVent, label: "Ar condicionado", available: space.air_conditioning },
                { icon: Utensils, label: "Cozinha", available: space.kitchen },
                { icon: Waves, label: "Piscina", available: space.pool }
              ].map((amenity, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    amenity.available 
                      ? 'border-green-200 bg-green-50 text-green-800' 
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <amenity.icon size={18} />
                  <span className="text-sm font-medium">{amenity.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium" 
                onClick={handleWhatsApp}
              >
                <Phone size={18} className="mr-2" />
                Contato
              </Button>
              <Button
                className="h-12 bg-primary hover:bg-primary/90 font-medium"
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

            {isAdmin && (
              <Button
                variant="destructive"
                className="w-full h-12 font-medium"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2" size={18} />
                Excluir Espaço
              </Button>
            )}
          </div>
        </div>

        {/* Modals and Dialogs */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este espaço? Esta ação não pode ser
                desfeita.
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
                onClick={handleDeleteSpace}
                disabled={deletingSpace}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingSpace ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ReportForm
          isOpen={reportFormOpen}
          onClose={() => setReportFormOpen(false)}
          reportedItemName={space.name}
          reportedItemUrl={window.location.href}
          reportType="space"
        />

        <ImageViewer
          images={displayImages}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          initialIndex={selectedImageIndex}
        />
      </div>
    </div>
  );
};

export default EventSpaceDetails;
