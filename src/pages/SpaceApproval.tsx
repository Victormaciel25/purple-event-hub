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
      console.log("🔍 Selected space changed, fetching photo URLs for space:", selectedSpace.id);
      console.log("🔍 Photos from selected space:", selectedSpace.photos);
      fetchPhotoUrls(selectedSpace.photos);
    } else {
      console.log("❌ No photos found for selected space or space is null");
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
      console.log("🚀 === FETCHING SPACE DETAILS ===");
      console.log("🚀 Space ID:", spaceId);
      
      // Buscar dados do espaço
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();

      if (spaceError) {
        console.error("❌ Error fetching space data:", spaceError);
        throw spaceError;
      }

      console.log("✅ Found space data:", spaceData);

      // Buscar informações do perfil do usuário
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", spaceData.user_id)
        .single();

      console.log("👤 Profile data:", profileData);

      // Buscar fotos usando a nova função RPC específica para admins
      console.log("📸 === FETCHING PHOTOS WITH ADMIN RPC ===");
      
      const { data: photosData, error: photosError } = await supabase
        .rpc('admin_get_space_photos', { space_id_param: spaceId });

      if (photosError) {
        console.error("❌ Error fetching photos with admin RPC:", photosError);
        toast.error("Erro ao buscar fotos do espaço");
      } else {
        console.log("✅ Admin RPC query succeeded, photos found:", photosData?.length || 0);
        if (photosData && photosData.length > 0) {
          photosData.forEach((photo, index) => {
            console.log(`📸 Photo ${index + 1}:`, {
              id: photo.id,
              space_id: photo.space_id,
              storage_path: photo.storage_path,
              created_at: photo.created_at
            });
          });
        }
      }

      // Combinar todos os dados
      const combinedData = {
        ...spaceData,
        profiles: profileData || null,
        photos: photosData || []
      };

      console.log("🎯 Combined space details with photos:", combinedData);
      console.log("🎯 Total photos in combined data:", combinedData.photos?.length || 0);
      
      setSelectedSpace(combinedData as unknown as SpaceDetailsType);
      setSheetOpen(true);
    } catch (error) {
      console.error("💥 Error fetching space details:", error);
      toast.error("Erro ao buscar detalhes do espaço");
    }
  };

  const fetchPhotoUrls = async (photos: { id: string; storage_path: string }[]) => {
    try {
      console.log("🌐 === CREATING PHOTO URLS ===");
      console.log("🌐 Input photos:", photos);
      console.log("🌐 Total photos to process:", photos?.length || 0);
      
      if (!photos || photos.length === 0) {
        console.log("❌ No photos available for URL creation");
        setPhotoUrls([]);
        return;
      }
      
      // Verificar se o bucket 'spaces' existe
      console.log("🔍 Checking if 'spaces' bucket exists...");
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("❌ Error listing buckets:", bucketsError);
      } else {
        console.log("✅ Available buckets:", buckets?.map(b => b.name));
        const spaceBucket = buckets?.find(b => b.name === 'spaces');
        if (!spaceBucket) {
          console.error("❌ 'spaces' bucket not found!");
          toast.error("Bucket de armazenamento não encontrado");
          return;
        } else {
          console.log("✅ 'spaces' bucket found:", spaceBucket);
        }
      }
      
      const urls = await Promise.all(
        photos.map(async (photo, index) => {
          if (!photo.storage_path) {
            console.error(`❌ Missing storage path for photo ${index + 1}:`, photo);
            return null;
          }
          
          try {
            console.log(`🔄 Processing photo ${index + 1}/${photos.length}`);
            console.log(`🔄 Storage path: "${photo.storage_path}"`);
            
            // Primeiro, verificar se o arquivo existe
            const { data: fileData, error: fileError } = await supabase.storage
              .from('spaces')
              .list('', {
                search: photo.storage_path.split('/').pop() // Buscar pelo nome do arquivo
              });
            
            if (fileError) {
              console.error(`❌ Error checking file existence for photo ${index + 1}:`, fileError);
            } else {
              console.log(`📁 File search result for photo ${index + 1}:`, fileData);
            }
            
            // Tentar criar URL pública primeiro
            console.log(`🔗 Creating public URL for photo ${index + 1}`);
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            if (publicUrlData?.publicUrl) {
              console.log(`✅ Public URL created for photo ${index + 1}:`, publicUrlData.publicUrl);
              
              // Verificar se a URL é acessível
              try {
                const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                  console.log(`✅ Public URL is accessible for photo ${index + 1}`);
                  return publicUrlData.publicUrl;
                } else {
                  console.log(`⚠️ Public URL not accessible (${response.status}) for photo ${index + 1}, trying signed URL`);
                }
              } catch (fetchError) {
                console.log(`⚠️ Error testing public URL for photo ${index + 1}:`, fetchError);
              }
            }

            // Fallback: tentar criar signed URL
            console.log(`🔐 Creating signed URL for photo ${index + 1}`);
            const { data: signedData, error: signedError } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);
            
            if (signedError) {
              console.error(`❌ Error creating signed URL for photo ${index + 1}:`, signedError);
              return null;
            }
            
            if (signedData?.signedUrl) {
              console.log(`✅ Signed URL created for photo ${index + 1}:`, signedData.signedUrl);
              return signedData.signedUrl;
            }
            
            console.error(`❌ Failed to create any URL for photo ${index + 1}`);
            return null;
          } catch (err) {
            console.error(`💥 Exception when creating URL for photo ${index + 1}:`, err);
            return null;
          }
        })
      );
      
      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("🎯 === FINAL RESULTS ===");
      console.log("🎯 Total input photos:", photos.length);
      console.log("🎯 Valid URLs created:", validUrls.length);
      console.log("🎯 Final valid photo URLs:", validUrls);
      
      if (validUrls.length === 0) {
        console.error("❌ No valid URLs could be created for any photos!");
        toast.error("Não foi possível carregar as fotos");
      }
      
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("💥 Error in fetchPhotoUrls:", error);
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
