import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import SpaceList from "@/components/approval/SpaceList";
import SpaceDetails, { SpaceDetailsType } from "@/components/approval/SpaceDetails";

type SpaceWithProfileInfo = {
  id: string;
  name: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
  photo_count?: number;
  price?: string;
};

const SpaceApproval = () => {
  const [spaces, setSpaces] = useState<SpaceWithProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<SpaceDetailsType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const { isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace?.photos) {
      fetchPhotoUrls(selectedSpace.photos);
    } else {
      setPhotoUrls([]);
    }
  }, [selectedSpace]);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      console.log("Fetching all spaces for admin approval...");
      
      // Usar a função RPC admin_get_all_spaces para garantir que admins vejam todos os espaços
      const { data: spacesData, error } = await supabase
        .rpc('admin_get_all_spaces');

      if (error) {
        console.error("Error fetching spaces:", error);
        toast.error("Erro ao buscar espaços: " + error.message);
        return;
      }

      console.log("Raw spaces data from RPC:", spacesData);

      if (!spacesData || spacesData.length === 0) {
        console.log("No spaces data returned");
        setSpaces([]);
        return;
      }

      // Processar os dados e buscar contagem de fotos para cada espaço
      const spacesWithPhotos = await Promise.all(
        spacesData.map(async (space: any) => {
          // Buscar contagem de fotos
          const { count: photoCount } = await supabase
            .from("space_photos")
            .select("id", { count: "exact" })
            .eq("space_id", space.id);

          return {
            ...space,
            photo_count: photoCount || 0,
            profiles: space.profiles || null
          };
        })
      );

      console.log("Processed spaces with photos:", spacesWithPhotos);
      console.log("Total spaces found:", spacesWithPhotos.length);
      
      // Contar espaços por status
      const pendingCount = spacesWithPhotos.filter(s => !s.status || s.status === 'pending').length;
      const approvedCount = spacesWithPhotos.filter(s => s.status === 'approved').length;
      const rejectedCount = spacesWithPhotos.filter(s => s.status === 'rejected').length;
      
      console.log("Spaces by status:", { pendingCount, approvedCount, rejectedCount });

      setSpaces(spacesWithPhotos);
    } catch (error) {
      console.error("Error in fetchSpaces:", error);
      toast.error("Erro ao buscar espaços");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      console.log("Fetching space details for ID:", spaceId);
      
      // Buscar todos os dados do espaço diretamente da tabela spaces
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();

      if (spaceError) {
        console.error("Error fetching space data:", spaceError);
        throw spaceError;
      }

      console.log("Found space data:", spaceData);

      // Buscar informações do perfil do usuário
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", spaceData.user_id)
        .single();

      console.log("Profile data:", profileData);

      // Buscar fotos do espaço
      const { data: photosData, error: photosError } = await supabase
        .from("space_photos")
        .select("id, storage_path")
        .eq("space_id", spaceId);

      if (photosError) {
        console.error("Error fetching photos:", photosError);
      }

      console.log("Photos data from database:", photosData);

      // Combinar todos os dados
      const combinedData = {
        ...spaceData,
        profiles: profileData || null,
        photos: photosData || []
      };

      console.log("Combined space details:", combinedData);
      setSelectedSpace(combinedData as unknown as SpaceDetailsType);
      setSheetOpen(true);
    } catch (error) {
      console.error("Error fetching space details:", error);
      toast.error("Erro ao buscar detalhes do espaço");
    }
  };

  const fetchPhotoUrls = async (photos: { id: string; storage_path: string }[]) => {
    try {
      console.log("Starting fetchPhotoUrls with photos:", photos);
      
      if (!photos || photos.length === 0) {
        console.log("No photos available");
        setPhotoUrls([]);
        return;
      }
      
      const urls = await Promise.all(
        photos.map(async (photo) => {
          if (!photo.storage_path) {
            console.error("Missing storage path for photo:", photo);
            return null;
          }
          
          try {
            console.log("Processing photo with storage_path:", photo.storage_path);
            
            // Tentar criar URL pública primeiro
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log("Created public URL:", publicUrlData.publicUrl);
              
              // Verificar se a URL é acessível
              try {
                const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                  console.log("Public URL is accessible:", publicUrlData.publicUrl);
                  return publicUrlData.publicUrl;
                }
              } catch (fetchError) {
                console.log("Public URL not accessible, trying signed URL");
              }
            }

            // Fallback: tentar criar signed URL
            const { data: signedData, error: signedError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry
            
            if (signedError) {
              console.error("Error creating signed URL:", signedError, "for path:", photo.storage_path);
              return null;
            }
            
            if (signedData?.signedUrl) {
              console.log("Created signed URL:", signedData.signedUrl);
              return signedData.signedUrl;
            }
            
            return null;
          } catch (err) {
            console.error("Exception when creating URL for photo:", photo.id, err);
            return null;
          }
        })
      );
      
      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("Final valid photo URLs:", validUrls);
      console.log("Total valid URLs found:", validUrls.length);
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("Error in fetchPhotoUrls:", error);
      toast.error("Erro ao carregar fotos");
      setPhotoUrls([]);
    }
  };

  const approveSpace = async () => {
    if (!selectedSpace) return;

    try {
      console.log("Approving space:", selectedSpace.id);
      
      const { data, error } = await supabase
        .from("spaces")
        .update({ status: "approved" })
        .eq("id", selectedSpace.id)
        .select();

      if (error) throw error;
      
      console.log("Space approved successfully:", data);
      toast.success("Espaço aprovado com sucesso!");
      setSheetOpen(false);
      fetchSpaces();
    } catch (error) {
      console.error("Error approving space:", error);
      toast.error("Erro ao aprovar espaço");
    }
  };

  const rejectSpace = async () => {
    if (!selectedSpace) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para rejeição");
      return;
    }

    try {
      console.log("Rejecting space:", selectedSpace.id);
      
      const { data, error } = await supabase
        .from("spaces")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason
        })
        .eq("id", selectedSpace.id)
        .select();

      if (error) throw error;
      
      console.log("Space rejected successfully:", data);
      toast.success("Espaço rejeitado");
      setSheetOpen(false);
      setRejectionReason("");
      fetchSpaces();
    } catch (error) {
      console.error("Error rejecting space:", error);
      toast.error("Erro ao rejeitar espaço");
    }
  };

  if (roleLoading) {
    return <div className="container px-4 py-6 flex items-center justify-center h-[80vh]">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">Aprovação de Espaços</h1>
        <div></div>
      </div>

      <SpaceList 
        spaces={spaces} 
        loading={loading} 
        onViewDetails={fetchSpaceDetails} 
      />

      {selectedSpace && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedSpace.name}</SheetTitle>
              <SheetDescription>
                Submetido por {selectedSpace.profiles?.first_name} {selectedSpace.profiles?.last_name} em {
                  new Date(selectedSpace.created_at).toLocaleDateString('pt-BR')
                }
              </SheetDescription>
            </SheetHeader>

            <SpaceDetails
              selectedSpace={selectedSpace}
              photoUrls={photoUrls}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              onApprove={approveSpace}
              onReject={rejectSpace}
              onClose={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default SpaceApproval;
