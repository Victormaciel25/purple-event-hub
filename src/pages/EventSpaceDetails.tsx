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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-gray-600 h-8 w-8" />
          <p className="text-gray-600 text-sm">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full hover:bg-gray-100"
              >
                <MoreVertical size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuItem onClick={() => toggleFavorite(space.id)} className="hover:bg-gray-50">
                <Heart
                  size={16}
                  className={`mr-3 ${isFavorite(space.id) ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                />
                {isFavorite(space.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare} className="hover:bg-gray-50">
                <Share size={16} className="mr-3 text-gray-500" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport} className="hover:bg-gray-50">
                <Flag size={16} className="mr-3 text-gray-500" />
                Denunciar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {/* Media Gallery */}
        <div className="mb-8">
          {photosLoading ? (
            <div className="h-80 bg-gray-200 flex items-center justify-center">
              <div className="flex items-center space-x-3 text-gray-500">
                <Loader2 className="animate-spin h-6 w-6" />
                <span className="text-sm">Carregando mídia...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Full width carousel */}
              <div className="block md:hidden">
                <Carousel>
                  <CarouselContent>
                    {displayMedia.map((media, i) => {
                      const photo = photos[i];
                      const isVideoFile = isVideo(media, photo);
                      
                      return (
                        <CarouselItem key={i}>
                          <div className="relative h-80 overflow-hidden">
                            {isVideoFile ? (
                              <video
                                src={media}
                                controls
                                className="w-full h-full object-cover"
                                preload="metadata"
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
                            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                              {i + 1}/{displayMedia.length}
                            </div>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {displayMedia.map((media, i) => {
                  const photo = photos[i];
                  const isVideoFile = isVideo(media, photo);
                  
                  return (
                    <div 
                      key={i} 
                      className={`relative overflow-hidden rounded-2xl ${i === 0 ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
                    >
                      <div className={`${i === 0 ? 'h-96' : 'h-48'}`}>
                        {isVideoFile ? (
                          <video
                            src={media}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                          >
                            Seu navegador não suporta vídeos.
                          </video>
                        ) : (
                          <OptimizedImage
                            src={media}
                            alt={`${space.name} ${i + 1}`}
                            className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                          />
                        )}
                      </div>
                      {displayMedia.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="px-6 pb-24">
          {/* Title and Price Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{space.name}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin size={16} className="mr-2" />
                  <span className="text-sm">{space.address}, {space.number} • {space.state}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{formatPrice(space.price)}</div>
                <Badge variant="secondary" className="mt-2 bg-gray-100 text-gray-700">
                  <Users className="mr-1" size={14} />
                  Até {space.capacity} pessoas
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Sobre o espaço</h3>
              <p className="text-gray-600 leading-relaxed">{space.description}</p>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Comodidades</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ParkingMeter, label: "Estacionamento", available: space.parking },
                  { icon: Wifi, label: "Wi-Fi", available: space.wifi },
                  { icon: Speaker, label: "Sistema de som", available: space.sound_system },
                  { icon: AirVent, label: "Ar condicionado", available: space.air_conditioning },
                  { icon: Utensils, label: "Cozinha", available: space.kitchen },
                  { icon: Waves, label: "Piscina", available: space.pool }
                ].map(({ icon: Icon, label, available }) => (
                  <div 
                    key={label}
                    className={`flex items-center p-3 rounded-xl transition-colors ${
                      available 
                        ? "bg-green-50 text-green-700" 
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    <Icon className="mr-3" size={20} />
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button 
              className="h-14 bg-green-600 hover:bg-green-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all" 
              size="lg" 
              onClick={handleWhatsApp}
            >
              <Phone className="mr-3" size={20} />
              WhatsApp
            </Button>
            <Button
              className="h-14 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
              onClick={startChat}
              disabled={currentUserId === spaceOwner?.id || processingChat}
            >
              {processingChat ? (
                <Loader2 className="mr-3 animate-spin" size={20} />
              ) : (
                <MessageSquare className="mr-3" size={20} />
              )}
              Mensagem
            </Button>
          </div>

          {/* Admin Delete Button */}
          {isAdmin && (
            <Button
              variant="destructive"
              className="w-full h-12 rounded-xl font-semibold"
              size="lg"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-3" size={18} />
              Excluir Espaço
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
  );
};

export default EventSpaceDetails;
