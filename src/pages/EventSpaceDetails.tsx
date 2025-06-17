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
  MapPin,
  Star
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="flex flex-col items-center space-y-6 p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
            <Loader2 className="absolute inset-0 m-auto animate-spin text-white h-8 w-8" />
          </div>
          <p className="text-gray-700 text-lg font-medium">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Fixed Header with Gradient */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-white/90 text-sm">
              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">4.8</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20"
                >
                  <MoreVertical size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl rounded-2xl">
                <DropdownMenuItem onClick={() => toggleFavorite(space.id)} className="hover:bg-purple-50 rounded-xl m-1">
                  <Heart
                    size={16}
                    className={`mr-3 ${isFavorite(space.id) ? "fill-red-500 text-red-500" : "text-gray-500"}`}
                  />
                  {isFavorite(space.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="hover:bg-purple-50 rounded-xl m-1">
                  <Share size={16} className="mr-3 text-gray-500" />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport} className="hover:bg-purple-50 rounded-xl m-1">
                  <Flag size={16} className="mr-3 text-gray-500" />
                  Denunciar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {/* Media Gallery */}
        <div className="mb-8 -mt-1">
          {photosLoading ? (
            <div className="h-80 bg-gradient-to-r from-purple-200 to-pink-200 flex items-center justify-center">
              <div className="flex items-center space-x-3 text-purple-600">
                <Loader2 className="animate-spin h-6 w-6" />
                <span className="text-sm font-medium">Carregando mídia...</span>
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
                            <div className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
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
                      className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${i === 0 ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
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
                            className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                          />
                        )}
                      </div>
                      {displayMedia.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                    {space.name}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-4">
                    <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mr-3">
                      <MapPin size={16} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">{space.address}, {space.number} • {space.state}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatPrice(space.price)}
                  </div>
                  <Badge className="mt-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2 text-sm font-medium">
                    <Users className="mr-2" size={14} />
                    Até {space.capacity} pessoas
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-4"></div>
                Sobre o espaço
              </h3>
              <p className="text-gray-700 leading-relaxed text-lg">{space.description}</p>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full mr-4"></div>
                Comodidades
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ParkingMeter, label: "Estacionamento", available: space.parking, color: "from-blue-500 to-cyan-500" },
                  { icon: Wifi, label: "Wi-Fi", available: space.wifi, color: "from-green-500 to-emerald-500" },
                  { icon: Speaker, label: "Sistema de som", available: space.sound_system, color: "from-purple-500 to-violet-500" },
                  { icon: AirVent, label: "Ar condicionado", available: space.air_conditioning, color: "from-sky-500 to-blue-500" },
                  { icon: Utensils, label: "Cozinha", available: space.kitchen, color: "from-orange-500 to-red-500" },
                  { icon: Waves, label: "Piscina", available: space.pool, color: "from-cyan-500 to-teal-500" }
                ].map(({ icon: Icon, label, available, color }) => (
                  <div 
                    key={label}
                    className={`flex items-center p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                      available 
                        ? `bg-gradient-to-r ${color} text-white shadow-lg` 
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <div className={`p-2 rounded-full mr-4 ${available ? "bg-white/20" : "bg-gray-200"}`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button 
              className="h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0" 
              size="lg" 
              onClick={handleWhatsApp}
            >
              <div className="p-2 bg-white/20 rounded-full mr-3">
                <Phone size={20} />
              </div>
              WhatsApp
            </Button>
            <Button
              className="h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0"
              size="lg"
              onClick={startChat}
              disabled={currentUserId === spaceOwner?.id || processingChat}
            >
              {processingChat ? (
                <Loader2 className="mr-3 animate-spin" size={20} />
              ) : (
                <div className="p-2 bg-white/20 rounded-full mr-3">
                  <MessageSquare size={20} />
                </div>
              )}
              Mensagem
            </Button>
          </div>

          {/* Admin Delete Button */}
          {isAdmin && (
            <Button
              variant="destructive"
              className="w-full h-14 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0"
              size="lg"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <div className="p-2 bg-white/20 rounded-full mr-3">
                <Trash2 size={18} />
              </div>
              Excluir Espaço
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">Excluir Espaço</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-lg">
              Tem certeza que deseja excluir este espaço? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da exclusão (obrigatório)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="mt-4 rounded-2xl border-gray-200 focus:border-purple-500"
            rows={3}
          />
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel 
              disabled={deletingSpace}
              className="rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSpace}
              disabled={deletingSpace}
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-2xl border-0"
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
