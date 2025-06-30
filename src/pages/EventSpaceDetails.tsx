import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, ChevronLeft, MoreVertical, Share, Flag, Heart } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReportForm from "@/components/ReportForm";
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
import { useUserRoles } from "@/hooks/useUserRoles";
import { useFavorites } from "@/hooks/useFavorites";
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
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { SUPABASE_CONFIG } from "@/config/app-config";
import ImageViewer from "@/components/ImageViewer";

interface Space {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  capacity: number;
  price: number;
  contact_number: string;
  amenities?: string[] | null;
  images?: string[] | null;
  available_days?: string[] | null;
  working_hours?: string | null;
  rating?: number;
}

const dayTranslations: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const EventSpaceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const { isFavorite, toggleFavorite } = useFavorites();

  // State for space deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  // State for report form
  const [reportFormOpen, setReportFormOpen] = useState(false);

  // State for image viewer
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        console.log("Fetching space details for ID:", id);

        const { data, error } = await supabase
          .from("spaces")
          .select("*")
          .eq("id", id)
          .eq("status", "approved")
          .single();

        if (error) {
          console.error("Error fetching space details:", error);
          toast.error("Erro ao carregar detalhes do espaço");
          return;
        }

        if (!data) {
          console.error("No space data found for ID:", id);
          return;
        }

        console.log("Space details fetched:", data);

        // Map the data from Supabase to our Space interface
        const spaceData: Space = {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description,
          address: data.address,
          capacity: data.capacity,
          price: data.price,
          contact_number: data.contact_number,
          amenities: data.amenities,
          images: data.images,
          available_days: data.available_days,
          working_hours: data.working_hours,
          rating: 4.8, // Default rating until we implement a rating system
        };

        setSpace(spaceData);
      } catch (error) {
        console.error("Failed to fetch space details:", error);
        toast.error("Erro ao carregar detalhes do espaço");
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceDetails();
  }, [id]);

  // Handler for WhatsApp redirect
  const handleWhatsApp = () => {
    if (!space) return;

    // Clean the phone number (remove non-numeric characters)
    const cleanPhone = space.contact_number.replace(/\D/g, "");

    // Create WhatsApp URL with pre-filled message
    const message = encodeURIComponent(`Olá, tenho interesse em alugar o espaço ${space.name}`);
    const whatsappUrl = `https://wa.me/+55${cleanPhone}?text=${message}`;

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank");
  };

  const handleShare = () => {
    if (!space) return;

    const url = window.location.href;
    const text = `Confira este espaço para eventos: ${space.name} - ${space.category}`;

    if (navigator.share) {
      navigator.share({
        title: `${space.name} - iParty`,
        text: text,
        url: url,
      }).catch(console.error);
    } else {
      // Create a more complete share text with the link
      const shareText = `${text}\n\nAcesse: ${url}`;

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
    if (!id || !deleteReason.trim()) {
      return;
    }

    try {
      setDeleting(true);
      console.log("=== INICIANDO EXCLUSÃO DE ESPAÇO ===");
      console.log("ID do espaço:", id);
      console.log("Motivo da exclusão:", deleteReason);
      
      // Use the edge function that sends email notifications
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/delete_space_with_notification`;
      console.log("URL da função:", functionUrl);
      
      const requestBody = { 
        space_id: id,
        deletion_reason: deleteReason
      };
      console.log("Dados da requisição:", requestBody);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("Status da resposta:", response.status);
      console.log("Status text:", response.statusText);
      
      const responseText = await response.text();
      console.log("Resposta raw:", responseText);
      
      if (!response.ok) {
        console.error("Erro na resposta da edge function:", {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        throw new Error(`Error ${response.status}: ${responseText || "Unknown error"}`);
      }
      
      const result = JSON.parse(responseText);
      console.log("Resultado da edge function:", result);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete space");
      }

      toast.success("Espaço excluído com sucesso e notificação enviada");
      console.log("✅ Operação concluída com sucesso");
      navigate("/profile");
    } catch (error) {
      console.error("Erro ao excluir espaço:", error);
      toast.error("Erro ao excluir espaço: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleFavoriteToggle = () => {
    if (!space) return;
    toggleFavorite(space.id);

    const isFav = isFavorite(space.id);
    toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Carregando detalhes do espaço...</p>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Espaço não encontrado.</p>
      </div>
    );
  }

  // Determine which images to display
  const displayImages = space.images && space.images.length > 0
    ? space.images
    : ["https://source.unsplash.com/random/800x600?event"];

  // Format available days from the database
  const availableDays = space.available_days && space.available_days.length > 0
    ? space.available_days.map(day => dayTranslations[day] || day)
    : [];

  const isSpaceFavorited = isFavorite(space.id);

  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="h-full w-full overflow-y-auto scrollbar-hide">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
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
                <DropdownMenuItem onClick={handleFavoriteToggle}>
                  <Heart size={16} className="mr-2" fill={isSpaceFavorited ? "currentColor" : "none"} />
                  {isSpaceFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
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

          {/* image display - responsive carousel for all screen sizes */}
          <div className="mb-6">
            {/* Mobile: Carousel */}
            <div className="block md:hidden">
              <Carousel>
                <CarouselContent>
                  {displayImages.map((image, index) => (
                    <CarouselItem key={index} className="w-full h-64">
                      <div className="relative rounded-lg overflow-hidden h-full cursor-pointer" onClick={() => handleImageClick(index)}>
                        <OptimizedImage
                          src={image}
                          alt={`${space.name} - Imagem ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          loadingClassName="animate-pulse bg-gray-200"
                        />
                        <div className="absolute bottom-2 right-2">
                          <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {index + 1}/{displayImages.length}
                          </span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Tablet/Desktop: Horizontal Scrollable Row */}
            <div className="hidden md:block">
              <Carousel>
                <CarouselContent className="-ml-2 md:-ml-4">
                  {displayImages.map((image, index) => (
                    <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/3 lg:basis-1/4">
                      <div className="relative rounded-lg overflow-hidden h-48 lg:h-56 cursor-pointer" onClick={() => handleImageClick(index)}>
                        <OptimizedImage
                          src={image}
                          alt={`${space.name} - Imagem ${index + 1}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute bottom-2 right-2">
                          <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{space.name}</h1>
            <Badge variant="outline" className="mb-4 bg-secondary">
              {space.category}
            </Badge>

            <p className="text-gray-700 mb-6">{space.description}</p>

            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin size={20} className="text-iparty mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Endereço</h3>
                  <p className="text-gray-700">{space.address}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Calendar size={20} className="text-iparty mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Capacidade</h3>
                  <p className="text-gray-700">{space.capacity} pessoas</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock size={20} className="text-iparty mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Preço</h3>
                  <p className="text-gray-700">R$ {space.price}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone size={20} className="text-iparty mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Contato</h3>
                  <p className="text-gray-700">{space.contact_number}</p>
                </div>
              </div>

              {space.working_hours && (
                <div className="flex items-start">
                  <Clock size={20} className="text-iparty mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Horário de Atendimento</h3>
                    <p className="text-gray-700">{space.working_hours}</p>
                  </div>
                </div>
              )}

              {availableDays && availableDays.length > 0 && (
                <div className="flex items-start">
                  <Calendar size={20} className="text-iparty mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Dias Disponíveis</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableDays.map((day) => (
                        <Badge key={day} variant="secondary" className="text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full mb-4 bg-green-600 text-white hover:bg-green-700"
            onClick={handleWhatsApp}
          >
            <Phone className="mr-2" size={18} />
            WhatsApp
          </Button>

          {/* Admin Delete Button */}
          {(isAdmin || isSuperAdmin) && (
            <Button
              variant="destructive"
              className="w-full mb-4 flex items-center justify-center"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="mr-2" size={18} />
              {deleting ? "Excluindo..." : "Excluir Espaço"}
            </Button>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este espaço? Esta ação não pode ser
                  desfeita e um email será enviado ao proprietário.
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
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSpace}
                  disabled={deleting || !deleteReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Excluindo..." : "Excluir"}
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

          <div className="h-20"></div> {/* Space for bottom nav */}
        </div>
      </div>
    </div>
  );
};

export default EventSpaceDetails;
