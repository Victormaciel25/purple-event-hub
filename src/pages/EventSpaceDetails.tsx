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

  const handleDeleteSpace = async () => {
    if (!deleteReason.trim()) {
      toast.error("Por favor, forneça um motivo para a exclusão");
      return;
    }

    try {
      setDeletingSpace(true);
      
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

  console.log("🖼️ SPACE_DETAILS: Estado das fotos:", {
    photosLoading,
    photoUrlsLength: photoUrls?.length || 0,
    photoUrls: photoUrls?.slice(0, 2)
  });

  const displayImages = photoUrls && photoUrls.length > 0 
    ? photoUrls 
    : ["https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop"];

  if (loading || !space) {
    return (
      <div className="container px-4 py-6 flex items-center justify-center h-[70vh]">
        <Loader2 className="animate-spin text-iparty h-8 w-8" />
      </div>
    );
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="h-full w-full overflow-y-auto scrollbar-hide">
        <div className="container px-4 py-6 pb-20 mx-auto max-w-4xl">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-gray-100">
              <ChevronLeft size={20} />
              <span className="ml-2 hidden sm:inline">Voltar</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-gray-100">
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

          {/* Image Gallery */}
          <Card className="mb-8 overflow-hidden shadow-lg border-gray-200">
            {photosLoading ? (
              <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <span className="text-gray-500">Carregando fotos...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile: Carousel */}
                <div className="block md:hidden">
                  <Carousel>
                    <CarouselContent>
                      {displayImages.map((image, i) => (
                        <CarouselItem key={i}>
                          <div className="relative h-80 cursor-pointer" onClick={() => handleImageClick(i)}>
                            <OptimizedImage
                              src={image}
                              alt={`${space.name} ${i + 1}`}
                              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-4 right-4">
                              <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                                {i + 1}/{displayImages.length}
                              </span>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>

                {/* Desktop: Horizontal Grid */}
                <div className="hidden md:block">
                  <Carousel>
                    <CarouselContent className="-ml-2">
                      {displayImages.map((image, i) => (
                        <CarouselItem key={i} className="pl-2 md:basis-1/2 lg:basis-1/3">
                          <div className="relative h-60 lg:h-72 cursor-pointer rounded-lg overflow-hidden" onClick={() => handleImageClick(i)}>
                            <OptimizedImage
                              src={image}
                              alt={`${space.name} ${i + 1}`}
                              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-3 right-3">
                              <span className="bg-black/70 text-white px-2 py-1 rounded-full text-sm">
                                {i + 1}
                              </span>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>
              </>
            )}
          </Card>

          {/* Space Title and Price */}
          <Card className="mb-6 p-6 shadow-lg border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{space.name}</h1>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    <span className="text-sm">{space.address}, {space.number} – {space.state}</span>
                  </div>
                  <p className="text-sm text-gray-500">CEP: {space.zip_code}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-iparty mb-1">
                    A partir de {formatPrice(space.price)}
                  </div>
                  <Badge variant="secondary" className="bg-iparty/10 text-iparty border-iparty/20">
                    <Users className="mr-1" size={14} />
                    Até {space.capacity} pessoas
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="mb-6 shadow-lg border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Sobre o espaço</h3>
              <p className="text-gray-700 leading-relaxed">{space.description}</p>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card className="mb-6 shadow-lg border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-6 text-gray-900">Comodidades</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`flex items-center p-3 rounded-lg ${space.parking ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <ParkingMeter className="mr-3" size={20} />
                  <span className="font-medium">{space.parking ? "Estacionamento" : "Sem estacionamento"}</span>
                </div>
                <div className={`flex items-center p-3 rounded-lg ${space.wifi ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <Wifi className="mr-3" size={20} />
                  <span className="font-medium">{space.wifi ? "Wi-Fi" : "Sem Wi-Fi"}</span>
                </div>
                <div className={`flex items-center p-3 rounded-lg ${space.sound_system ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <Speaker className="mr-3" size={20} />
                  <span className="font-medium">{space.sound_system ? "Sistema de som" : "Sem sistema de som"}</span>
                </div>
                <div className={`flex items-center p-3 rounded-lg ${space.air_conditioning ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <AirVent className="mr-3" size={20} />
                  <span className="font-medium">{space.air_conditioning ? "Ar condicionado" : "Sem ar condicionado"}</span>
                </div>
                <div className={`flex items-center p-3 rounded-lg ${space.kitchen ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <Utensils className="mr-3" size={20} />
                  <span className="font-medium">{space.kitchen ? "Cozinha" : "Sem cozinha"}</span>
                </div>
                <div className={`flex items-center p-3 rounded-lg ${space.pool ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"} transition-colors`}>
                  <Waves className="mr-3" size={20} />
                  <span className="font-medium">{space.pool ? "Piscina" : "Sem piscina"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="mb-8 shadow-lg border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
                <MapPin className="mr-2" size={20} />
                Localização
              </h3>
              {space.latitude && space.longitude ? (
                <div>
                  <div className="h-64 bg-gray-100 rounded-lg overflow-hidden border mb-3">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${space.latitude},${space.longitude}&zoom=15`}
                      allowFullScreen
                      title={`Localização de ${space.name}`}
                      className="rounded-lg"
                    ></iframe>
                  </div>
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    📍 {space.address}, {space.number} - {space.state}
                  </p>
                </div>
              ) : (
                <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                  <MapPin size={32} className="text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm mb-1">Localização não definida no mapa</p>
                  <p className="text-xs text-gray-400">
                    📍 {space.address}, {space.number} - {space.state}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl" 
              size="lg" 
              onClick={handleWhatsApp}
            >
              <Phone className="mr-3" size={20} />
              Entrar em Contato
            </Button>
            <Button
              className="bg-iparty hover:bg-iparty-dark text-white py-6 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
              size="lg"
              onClick={startChat}
              disabled={currentUserId === spaceOwner?.id || processingChat}
            >
              {processingChat ? (
                <Loader2 className="mr-3 animate-spin" size={20} />
              ) : (
                <MessageSquare className="mr-3" size={20} />
              )}
              Enviar Mensagem
            </Button>
          </div>

          {/* Admin Delete Button */}
          {isAdmin && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <Button
                  variant="destructive"
                  className="w-full py-4 text-lg font-semibold"
                  size="lg"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-3" size={20} />
                  Excluir Espaço
                </Button>
              </CardContent>
            </Card>
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

          {/* Image Viewer */}
          <ImageViewer
            images={displayImages}
            isOpen={imageViewerOpen}
            onClose={() => setImageViewerOpen(false)}
            initialIndex={selectedImageIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default EventSpaceDetails;
