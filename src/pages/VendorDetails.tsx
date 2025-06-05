import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, MapPin, Calendar, Clock, ChevronLeft, MoreVertical, Share, Flag } from "lucide-react";
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

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  description: string;
  address: string;
  working_hours?: string | null;
  images?: string[] | null;
  available_days?: string[] | null;
  rating?: number; // We'll keep this in the interface for now
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

const VendorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isSuperAdmin } = useUserRoles();
  
  // State for vendor deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  // State for report form
  const [reportFormOpen, setReportFormOpen] = useState(false);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        console.log("Fetching vendor details for ID:", id);
        
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", id)
          .eq("status", "approved")
          .single();

        if (error) {
          console.error("Error fetching vendor details:", error);
          toast.error("Erro ao carregar detalhes do fornecedor");
          return;
        }

        if (!data) {
          console.error("No vendor data found for ID:", id);
          return;
        }
        
        console.log("Vendor details fetched:", data);
        
        // Map the data from Supabase to our Vendor interface
        const vendorData: Vendor = {
          id: data.id,
          name: data.name,
          category: data.category,
          contact_number: data.contact_number,
          description: data.description,
          address: data.address,
          working_hours: data.working_hours,
          images: data.images,
          available_days: data.available_days,
          rating: 4.8, // Default rating until we implement a rating system
        };
        
        setVendor(vendorData);
      } catch (error) {
        console.error("Failed to fetch vendor details:", error);
        toast.error("Erro ao carregar detalhes do fornecedor");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [id]);

  // Handler for WhatsApp redirect
  const handleWhatsApp = () => {
    if (!vendor) return;
    
    // Clean the phone number (remove non-numeric characters)
    const cleanPhone = vendor.contact_number.replace(/\D/g, "");
    
    // Create WhatsApp URL with pre-filled message
    const message = encodeURIComponent(`Olá, tenho interesse nos serviços de ${vendor.name}`);
    const whatsappUrl = `https://wa.me/+55${cleanPhone}?text=${message}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank");
  };

  const handleShare = () => {
    if (!vendor) return;
    
    const url = window.location.href;
    const text = `Confira este fornecedor: ${vendor.name}`;
    
    if (navigator.share) {
      navigator.share({
        title: vendor.name,
        text: text,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
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
  const handleDeleteVendor = async () => {
    if (!id || !deleteReason.trim()) {
      return;
    }

    try {
      setDeleting(true);
      
      // Call the edge function to delete the vendor and create notification
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/delete_vendor_with_notification`;
      
      console.log("Calling edge function for vendor deletion:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify({ 
          vendorId: id,
          deleteReason: deleteReason
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
        throw new Error(result.error || "Failed to delete vendor");
      }

      toast.success("Fornecedor excluído com sucesso");
      navigate("/vendors");
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Erro ao excluir fornecedor");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Carregando detalhes do fornecedor...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Fornecedor não encontrado.</p>
      </div>
    );
  }

  // Determine which images to display
  const displayImages = vendor.images && vendor.images.length > 0 
    ? vendor.images 
    : ["https://source.unsplash.com/random/800x600?business"];

  // Format available days from the database
  const availableDays = vendor.available_days && vendor.available_days.length > 0
    ? vendor.available_days.map(day => dayTranslations[day] || day)
    : [];

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
                      <OptimizedImage
                        src={image}
                        alt={`${vendor.name} - Imagem ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                        loadingClassName="animate-pulse bg-gray-200"
                      />
                      <div className="absolute bottom-2 right-2">
                        <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {index + 1}/{displayImages.length}
                        </span>
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
                      <div className="relative rounded-lg overflow-hidden h-48 lg:h-56">
                        <OptimizedImage
                          src={image}
                          alt={`${vendor.name} - Imagem ${index + 1}`}
                          className="object-cover w-full h-full"
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

            <div className="flex justify-center mt-2">
              <p className="text-xs text-muted-foreground">
                {displayImages.length} {displayImages.length === 1 ? 'imagem' : 'imagens'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{vendor.name}</h1>
            <Badge variant="outline" className="mb-4 bg-secondary">
              {vendor.category}
            </Badge>
            
            <p className="text-gray-700 mb-6">{vendor.description}</p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Phone size={20} className="text-iparty mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Contato</h3>
                  <p className="text-gray-700">{vendor.contact_number}</p>
                </div>
              </div>
              
              {vendor.address && (
                <div className="flex items-start">
                  <MapPin size={20} className="text-iparty mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Endereço</h3>
                    <p className="text-gray-700">{vendor.address}</p>
                  </div>
                </div>
              )}
              
              {vendor.working_hours && (
                <div className="flex items-start">
                  <Clock size={20} className="text-iparty mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Horário de Atendimento</h3>
                    <p className="text-gray-700">{vendor.working_hours}</p>
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
              {deleting ? "Excluindo..." : "Excluir Fornecedor"}
            </Button>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser
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
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteVendor}
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
            reportedItemName={vendor.name}
            reportedItemUrl={window.location.href}
            reportType="vendor"
          />

          <div className="h-20"></div> {/* Space for bottom nav */}
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
