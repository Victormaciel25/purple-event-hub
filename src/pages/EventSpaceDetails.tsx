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
  Flag
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import { useSpacePhotos } from "../hooks/useSpacePhotos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import ReportForm from "@/components/ReportForm";

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
  
  // Use o hook useSpacePhotos para buscar as fotos
  const { photos, photoUrls, loading: photosLoading } = useSpacePhotos(id || null);

  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [spaceOwner, setSpaceOwner] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processingChat, setProcessingChat] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingSpace, setDeletingSpace] = useState(false);

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
      const { data: sd, error: se } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      if (se || !sd) throw se || new Error("Not found");
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
      console.error(err);
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
      // Create a more complete share text with the link
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

  // Fix the handleDeleteSpace function to avoid void truthiness checks
  const handleDeleteSpace = async () => {
    if (!deleteReason.trim()) {
      toast.error("Por favor, forneça um motivo para a exclusão");
      return;
    }

    try {
      setDeletingSpace(true);

      // Create a notification for the space owner
      if (space && space.user_id) {
        const { error: notificationError } = await supabase
          .from("space_deletion_notifications")
          .insert({
            user_id: space.user_id,
            space_name: space.name,
            deletion_reason: deleteReason
          });

        if (notificationError) {
          console.error("Erro ao criar notificação:", notificationError);
          toast.error("Erro ao notificar o proprietário");
        }
      }

      // Delete the space using the existing function
      if (space) {
        const { error } = await supabase.functions.invoke("delete_space_with_photos", {
          body: { space_id: space.id }
        });

        if (error) throw error;

        toast.success("Espaço excluído com sucesso");
        setDeleteDialogOpen(false);
        navigate('/explore');
      }
    } catch (error) {
      console.error("Erro ao excluir espaço:", error);
      toast.error("Erro ao excluir espaço");
    } finally {
      setDeletingSpace(false);
    }
  };

  // Função melhorada para verificar se é vídeo
  const isVideo = (url: string, photo?: any) => {
    // Primeiro, verificar pela extensão do arquivo na URL
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    const urlLower = url.toLowerCase();
    
    if (videoExtensions.some(ext => urlLower.includes(ext))) {
      return true;
    }
    
    // Verificar pelo storage_path se disponível
    if (photo && photo.storage_path) {
      const pathLower = photo.storage_path.toLowerCase();
      if (videoExtensions.some(ext => pathLower.includes(ext))) {
        return true;
      }
    }
    
    // Verificar por indicadores de vídeo na URL
    if (urlLower.includes('video') || urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov')) {
      return true;
    }
    
    return false;
  };

  // Determinar quais imagens/vídeos exibir
  const displayMedia = photoUrls && photoUrls.length > 0 
    ? photoUrls 
    : ["https://source.unsplash.com/random/600x400?event"];

  if (loading || !space) {
    return (
      <div className="container px-4 py-6 flex items-center justify-center h-[70vh]">
        <Loader2 className="animate-spin text-iparty h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="h-full w-full overflow-y-auto scrollbar-hide">
        <div className="container px-4 py-6 pb-20 mx-auto">
          {/* back & actions dropdown at top */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft size={20} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
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

          {/* image/video display - responsive carousel for all screen sizes */}
          <div className="mb-6">
            {photosLoading ? (
              <div className="h-64 md:h-48 lg:h-56 bg-gray-200 rounded-lg flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                <span className="ml-2 text-gray-500">Carregando mídia...</span>
              </div>
            ) : (
              <>
                {console.log("🎬 Renderizando mídia - URLs:", displayMedia)}
                {console.log("🎬 Fotos originais:", photos)}
                
                {/* Mobile: Carousel */}
                <div className="block md:hidden">
                  <Carousel>
                    <CarouselContent>
                      {displayMedia.map((media, i) => {
                        const photo = photos[i];
                        const isVideoFile = isVideo(media, photo);
                        console.log(`🎬 Item ${i}: ${media} - É vídeo? ${isVideoFile}`);
                        
                        return (
                          <CarouselItem key={i}>
                            <div className="relative rounded-lg overflow-hidden h-64">
                              {isVideoFile ? (
                                <video
                                  src={media}
                                  controls
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  onError={(e) => console.error("❌ Erro ao carregar vídeo:", e)}
                                  onLoadStart={() => console.log("🎬 Iniciando carregamento do vídeo:", media)}
                                >
                                  Seu navegador não suporta vídeos.
                                </video>
                              ) : (
                                <OptimizedImage
                                  src={media}
                                  alt={`${space.name} ${i + 1}`}
                                  className="object-cover w-full h-full"
                                />
                              )}
                              <div className="absolute bottom-2 right-2">
                                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                  {i + 1}/{displayMedia.length}
                                </span>
                              </div>
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>

                {/* Tablet/Desktop: Horizontal Scrollable Row */}
                <div className="hidden md:block">
                  <Carousel>
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {displayMedia.map((media, i) => {
                        const photo = photos[i];
                        const isVideoFile = isVideo(media, photo);
                        console.log(`🎬 Desktop Item ${i}: ${media} - É vídeo? ${isVideoFile}`);
                        
                        return (
                          <CarouselItem key={i} className="pl-2 md:pl-4 md:basis-1/3 lg:basis-1/4">
                            <div className="relative rounded-lg overflow-hidden h-48 lg:h-56">
                              {isVideoFile ? (
                                <video
                                  src={media}
                                  controls
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  onError={(e) => console.error("❌ Erro ao carregar vídeo:", e)}
                                  onLoadStart={() => console.log("🎬 Iniciando carregamento do vídeo:", media)}
                                >
                                  Seu navegador não suporta vídeos.
                                </video>
                              ) : (
                                <OptimizedImage
                                  src={media}
                                  alt={`${space.name} ${i + 1}`}
                                  className="object-cover w-full h-full"
                                />
                              )}
                              <div className="absolute bottom-2 right-2">
                                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                  {i + 1}
                                </span>
                              </div>
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>
              </>
            )}
          </div>

          {/* title */}
          <h1 className="text-2xl font-bold mb-6 truncate">{space.name}</h1>

          {/* price / details */}
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

          {/* about */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Sobre o espaço</h3>
            <p className="text-muted-foreground">{space.description}</p>
          </div>

          {/* amenities */}
          <div className="mb-8">
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
          </div>

          {/* contact buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button className="bg-green-600 hover:bg-green-700" size="lg" onClick={handleWhatsApp}>
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

          {/* delete button for admin */}
          {isAdmin && (
            <Button
              variant="destructive"
              className="w-full mb-6"
              size="lg"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2" size={18} />
              Excluir Espaço
            </Button>
          )}

          {/* delete confirmation */}
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

          {/* Report Form */}
          <ReportForm
            isOpen={reportFormOpen}
            onClose={() => setReportFormOpen(false)}
            reportedItemName={space.name}
            reportedItemUrl={window.location.href}
            reportType="space"
          />
        </div>
      </div>
    </div>
  );
};

export default EventSpaceDetails;
