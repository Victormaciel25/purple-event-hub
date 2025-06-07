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
      console.log("🔍 DEBUGGING MISSING SPACE: 62314913-3a5d-4bb2-a16b-bbfc18729527");
      
      // Primeira busca: tentar encontrar o espaço específico que está faltando
      const { data: specificSpace, error: specificError } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          created_at,
          status,
          user_id,
          price,
          profiles:profiles!user_id (
            first_name, 
            last_name
          )
        `)
        .eq('id', '62314913-3a5d-4bb2-a16b-bbfc18729527');

      console.log("🎯 SPECIFIC SPACE SEARCH RESULT:", { specificSpace, specificError });

      // Segunda busca: buscar TODOS os espaços sem filtros
      const { data: allData, error: allError } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          created_at,
          status,
          user_id,
          price,
          profiles:profiles!user_id (
            first_name, 
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      console.log("📊 ALL SPACES QUERY:", { 
        totalSpaces: allData?.length || 0, 
        allError,
        spaceIds: allData?.map(s => s.id) || []
      });

      if (allError) {
        console.error("❌ Error fetching all spaces:", allError);
        throw allError;
      }

      // Verificar se o espaço específico está na lista geral
      const missingSpaceInList = allData?.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527');
      console.log("🔍 MISSING SPACE IN GENERAL LIST:", missingSpaceInList);

      // Análise detalhada de cada espaço
      if (allData && allData.length > 0) {
        console.log("🔍 DETAILED ANALYSIS OF ALL SPACES:");
        allData.forEach((space, index) => {
          const statusInfo = {
            id: space.id,
            name: space.name,
            status: space.status,
            statusType: typeof space.status,
            statusRaw: JSON.stringify(space.status),
            isPendingStrict: space.status === 'pending',
            isPendingLoose: String(space.status) === 'pending',
            isNull: space.status === null,
            isUndefined: space.status === undefined,
            created_at: space.created_at
          };
          
          console.log(`Space ${index + 1}:`, statusInfo);
        });
      }

      // Buscar espaços com diferentes abordagens de filtragem
      const pendingSpacesMethod1 = allData?.filter(s => s.status === 'pending') || [];
      const pendingSpacesMethod2 = allData?.filter(s => String(s.status) === 'pending') || [];
      const pendingSpacesMethod3 = allData?.filter(s => s.status?.toString() === 'pending') || [];
      const nullStatusSpaces = allData?.filter(s => s.status === null || s.status === undefined) || [];

      console.log("🔄 FILTERING METHODS COMPARISON:");
      console.log("Method 1 (strict ===):", pendingSpacesMethod1.length, pendingSpacesMethod1.map(s => s.name));
      console.log("Method 2 (String conversion):", pendingSpacesMethod2.length, pendingSpacesMethod2.map(s => s.name));
      console.log("Method 3 (toString):", pendingSpacesMethod3.length, pendingSpacesMethod3.map(s => s.name));
      console.log("Null/undefined status:", nullStatusSpaces.length, nullStatusSpaces.map(s => s.name));

      // Busca adicional: verificar se há problemas com o join do profiles
      const { data: spacesNoProfiles, error: noProfilesError } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          created_at,
          status,
          user_id,
          price
        `)
        .order('created_at', { ascending: false });

      console.log("📋 SPACES WITHOUT PROFILES JOIN:", { 
        totalSpaces: spacesNoProfiles?.length || 0, 
        noProfilesError,
        missingSpacePresent: spacesNoProfiles?.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527')
      });

      // Se encontramos mais espaços sem o join de profiles, use esses dados
      let finalSpaces = allData || [];
      if (spacesNoProfiles && spacesNoProfiles.length > (allData?.length || 0)) {
        console.log("🔄 USING SPACES WITHOUT PROFILES DUE TO JOIN ISSUES");
        finalSpaces = spacesNoProfiles.map(space => ({
          ...space,
          profiles: null
        }));
      }

      // Se o espaço específico foi encontrado na busca individual mas não na geral, adicione-o
      if (specificSpace && specificSpace.length > 0 && !finalSpaces.find(s => s.id === specificSpace[0].id)) {
        console.log("➕ ADDING MISSING SPACE TO LIST");
        finalSpaces = [...finalSpaces, ...specificSpace];
      }

      // Count photos for each space
      const spacesWithCounts = await Promise.all(
        finalSpaces.map(async (space: any) => {
          try {
            const { count, error: countError } = await supabase
              .from("space_photos")
              .select("id", { count: "exact" })
              .eq("space_id", space.id);

            if (countError) {
              console.error(`Error counting photos for space ${space.id}:`, countError);
            }

            return {
              ...space,
              photo_count: count || 0
            };
          } catch (err) {
            console.error(`Exception counting photos for space ${space.id}:`, err);
            return {
              ...space,
              photo_count: 0
            };
          }
        })
      );

      console.log("📸 FINAL SPACES WITH PHOTO COUNTS:", spacesWithCounts.length);
      console.log("🎯 FINAL CHECK - Missing space present:", spacesWithCounts.find(s => s.id === '62314913-3a5d-4bb2-a16b-bbfc18729527'));
      
      setSpaces(spacesWithCounts as SpaceWithProfileInfo[]);
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
            // Make sure we're using the full storage path
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
      
      // Filter out any null values and set the URLs
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
