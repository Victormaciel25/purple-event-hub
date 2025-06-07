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
      console.log("🔍 SIMPLIFIED FETCH - Searching for missing space: 62314913-3a5d-4bb2-a16b-bbfc18729527");
      
      // Buscar TODOS os espaços sem joins complexos primeiro
      const { data: rawSpaces, error: rawError } = await supabase
        .from("spaces")
        .select("*")
        .order('created_at', { ascending: false });

      console.log("📊 RAW SPACES RESULT:", { 
        total: rawSpaces?.length || 0, 
        error: rawError,
        missingSpaceFound: rawSpaces?.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527')
      });

      if (rawError) {
        console.error("❌ Error in raw fetch:", rawError);
        throw rawError;
      }

      if (!rawSpaces || rawSpaces.length === 0) {
        console.log("⚠️ No spaces found at all");
        setSpaces([]);
        return;
      }

      // Log de todos os espaços encontrados
      console.log("🔍 ALL SPACES FOUND:");
      rawSpaces.forEach((space, index) => {
        console.log(`Space ${index + 1}: ID=${space.id}, Name="${space.name}", Status=${space.status}`);
      });

      // Verificar se o espaço específico está presente
      const missingSpace = rawSpaces.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527');
      if (missingSpace) {
        console.log("✅ MISSING SPACE FOUND:", missingSpace);
      } else {
        console.log("❌ MISSING SPACE NOT FOUND IN DATABASE");
        
        // Tentar busca direta por ID
        const { data: directSearch, error: directError } = await supabase
          .from("spaces")
          .select("*")
          .eq('id', '62314913-3a5d-4bb2-a16b-bbfc18729527');
          
        console.log("🎯 DIRECT ID SEARCH:", { directSearch, directError });
      }

      // Agora buscar os profiles separadamente
      const spacesWithProfiles = await Promise.all(
        rawSpaces.map(async (space) => {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", space.user_id)
              .single();

            // Contar fotos
            const { count: photoCount } = await supabase
              .from("space_photos")
              .select("id", { count: "exact" })
              .eq("space_id", space.id);

            return {
              ...space,
              profiles: profile,
              photo_count: photoCount || 0
            };
          } catch (err) {
            console.error(`Error processing space ${space.id}:`, err);
            return {
              ...space,
              profiles: null,
              photo_count: 0
            };
          }
        })
      );

      console.log("✅ FINAL SPACES WITH PROFILES:", spacesWithProfiles.length);
      console.log("🎯 MISSING SPACE IN FINAL LIST:", spacesWithProfiles.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527'));
      
      setSpaces(spacesWithProfiles as SpaceWithProfileInfo[]);
    } catch (error) {
      console.error("❌ Error fetching spaces:", error);
      toast.error("Erro ao buscar espaços");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          *,
          profiles:profiles!user_id (
            first_name, 
            last_name
          ),
          photos:space_photos (
            id, 
            storage_path
          )
        `)
        .eq("id", spaceId)
        .single();

      if (error) {
        throw error;
      }

      console.log("Fetched space details:", data);
      setSelectedSpace(data as unknown as SpaceDetailsType);
      setSheetOpen(true);
    } catch (error) {
      console.error("Error fetching space details:", error);
      toast.error("Erro ao buscar detalhes do espaço");
    }
  };

  const fetchPhotoUrls = async (photos: { id: string; storage_path: string }[]) => {
    try {
      console.log("Photos to fetch:", photos);
      
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
            const { data, error } = await supabase.storage
              .from('spaces')
              .createSignedUrl(photo.storage_path, 3600);
            
            if (error) {
              console.error("Error creating signed URL:", error, "for path:", photo.storage_path);
              return null;
            }
            
            console.log("Created signed URL for photo:", photo.id, data.signedUrl);
            return data.signedUrl;
          } catch (err) {
            console.error("Exception when creating signed URL:", err);
            return null;
          }
        })
      );
      
      const validUrls = urls.filter(url => url !== null) as string[];
      console.log("Final valid photo URLs:", validUrls);
      setPhotoUrls(validUrls);
    } catch (error) {
      console.error("Error fetching photo URLs:", error);
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
