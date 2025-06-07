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
      console.log("Fetching ALL spaces for approval...");
      
      // Primeiro, vamos buscar todos os espaços sem filtro de status
      const { data, error } = await supabase
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

      console.log("Raw spaces query result:", { data, error, totalCount: data?.length });

      if (error) {
        console.error("Error fetching spaces:", error);
        throw error;
      }

      // Log detalhado de cada espaço com foco no status
      if (data && data.length > 0) {
        console.log("=== DETAILED SPACES ANALYSIS ===");
        data.forEach((space, index) => {
          console.log(`Space ${index + 1}: "${space.name}"`, {
            id: space.id,
            name: space.name,
            status: space.status,
            statusType: typeof space.status,
            statusValue: JSON.stringify(space.status),
            statusLength: space.status?.length,
            created_at: space.created_at,
            user_id: space.user_id
          });
          
          // Verificação específica para "Sitio do zé"
          if (space.name && space.name.toLowerCase().includes("sitio do zé")) {
            console.log("🔍 FOUND 'Sitio do zé':", {
              fullName: space.name,
              status: space.status,
              statusExactValue: `"${space.status}"`,
              isPending: space.status === 'pending',
              isApproved: space.status === 'approved',
              isRejected: space.status === 'rejected'
            });
          }
        });
        console.log("=== END ANALYSIS ===");
      }

      console.log(`Found ${data?.length || 0} total spaces`);

      // Count photos for each space
      const spacesWithCounts = await Promise.all(
        (data || []).map(async (space: any) => {
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

      console.log("Spaces with photo counts:", spacesWithCounts);
      
      // Separar por status e mostrar contadores com análise detalhada
      const pending = spacesWithCounts.filter(s => {
        const isPending = s.status === 'pending';
        if (!isPending && s.name && s.name.toLowerCase().includes("sitio")) {
          console.log(`❌ Space "${s.name}" NOT in pending because status is:`, {
            status: s.status,
            statusType: typeof s.status,
            exactValue: JSON.stringify(s.status)
          });
        }
        return isPending;
      });
      
      const approved = spacesWithCounts.filter(s => s.status === 'approved');
      const rejected = spacesWithCounts.filter(s => s.status === 'rejected');
      const unknown = spacesWithCounts.filter(s => !['pending', 'approved', 'rejected'].includes(s.status));
      
      console.log("=== STATUS BREAKDOWN ===");
      console.log("Spaces by status:", {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        unknown: unknown.length,
        unknownStatuses: unknown.map(s => ({ id: s.id, name: s.name, status: s.status }))
      });
      
      // Log específico dos espaços pendentes
      if (pending.length > 0) {
        console.log("📋 PENDING SPACES:", pending.map(s => ({ name: s.name, status: s.status })));
      } else {
        console.log("⚠️ NO PENDING SPACES FOUND");
      }
      
      setSpaces(spacesWithCounts as SpaceWithProfileInfo[]);
    } catch (error) {
      console.error("Error fetching spaces:", error);
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
      const { error } = await supabase
        .from("spaces")
        .update({ status: "approved" })
        .eq("id", selectedSpace.id);

      if (error) throw error;
      
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
      const { error } = await supabase
        .from("spaces")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason
        })
        .eq("id", selectedSpace.id);

      if (error) throw error;
      
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
        <div></div> {/* Empty div for spacing */}
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
