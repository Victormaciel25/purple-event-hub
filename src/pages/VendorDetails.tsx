
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Star, ArrowLeft, MapPin, Calendar, Clock } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  description: string;
  address: string;
  working_hours?: string | null;
  images?: string[] | null;
  rating?: number;
}

const VendorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Format available days (this is a placeholder since we don't have this data yet)
  const availableDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4 pl-0 flex items-center text-gray-600"
      >
        <ArrowLeft size={20} className="mr-1" />
        <span>Voltar</span>
      </Button>

      <div className="w-full rounded-xl overflow-hidden mb-6">
        <Carousel className="w-full">
          <CarouselContent>
            {displayImages.map((image, index) => (
              <CarouselItem key={`vendor-image-${index}`} className="w-full h-64">
                <OptimizedImage
                  src={image}
                  alt={`${vendor.name} - Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                  loadingClassName="animate-pulse bg-gray-200"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {displayImages.length > 1 && (
            <>
              <CarouselPrevious className="left-2 lg:left-4" />
              <CarouselNext className="right-2 lg:right-4" />
            </>
          )}
        </Carousel>
        <div className="flex justify-center mt-2">
          <p className="text-xs text-muted-foreground">
            {displayImages.length} {displayImages.length === 1 ? 'imagem' : 'imagens'}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <div className="flex items-center text-yellow-500">
            <span className="text-lg font-medium mr-1">{vendor.rating}</span>
            <Star size={20} fill="currentColor" />
          </div>
        </div>
        
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
      
      <Button className="w-full mb-4 bg-iparty text-white hover:bg-iparty/90">
        Entrar em Contato
      </Button>

      <div className="h-20"></div> {/* Space for bottom nav */}
    </div>
  );
};

export default VendorDetails;
