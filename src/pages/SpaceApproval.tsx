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
  const { isAdmin, loading: roleLoading, userId } = useUserRoles();
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
      
      console.log("=== INICIANDO BUSCA DE ESPAÇOS ===");
      console.log("Usuário logado:", userId);
      console.log("É admin:", isAdmin);
      
      // Primeiro, verificar se conseguimos acessar o espaço específico
      const { data: specificSpace, error: specificError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", "62314913-3a5d-4bb2-a16b-bbfc18729527")
        .single();
      
      console.log("Busca do espaço específico:", specificSpace);
      console.log("Erro na busca específica:", specificError);
      
      // Verificar sessão atual
      const { data: session } = await supabase.auth.getSession();
      console.log("Sessão atual:", session.session?.user?.id);
      
      // Buscar todos os espaços sem filtros
      const { data: rawSpaces, error: spacesError } = await supabase
        .from("spaces")
        .select("*")
        .order('created_at', { ascending: false });

      console.log("Total de espaços retornados:", rawSpaces?.length);
      console.log("Query direta na tabela spaces:", rawSpaces);
      console.log("Erro na query (se houver):", spacesError);

      if (spacesError) {
        console.error("Erro ao buscar espaços:", spacesError);
        throw spacesError;
      }

      // Verificar especificamente o espaço que está faltando
      const targetSpace = rawSpaces?.find(space => space.id === "62314913-3a5d-4bb2-a16b-bbfc18729527");
      console.log("Espaço alvo encontrado na lista geral:", targetSpace);

      // Verificar se há algum espaço com status pending
      const pendingInRaw = rawSpaces?.filter(space => space.status === 'pending');
      console.log("Espaços com status 'pending' na query geral:", pendingInRaw);

      // Buscar perfis separadamente para cada espaço
      const spacesWithProfiles = await Promise.all(
        (rawSpaces || []).map(async (space) => {
          console.log(`Processando espaço: ${space.name} (${space.id}) - Status: "${space.status}"`);
          
          // Buscar perfil do usuário
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", space.user_id)
            .single();

          // Buscar contagem de fotos
          const { count: photoCount } = await supabase
            .from("space_photos")
            .select("id", { count: "exact" })
            .eq("space_id", space.id);

          return {
            ...space,
            profiles: profile,
            photo_count: photoCount || 0
          };
        })
      );

      console.log("Espaços processados com perfis:", spacesWithProfiles);
      console.log("Total de espaços após processamento:", spacesWithProfiles.length);
      
      // Verificar quantos espaços pendentes temos após processamento
      const pendingSpaces = spacesWithProfiles.filter(space => {
        const isPending = space.status === 'pending' || space.status === null || space.status === undefined;
        console.log(`Espaço ${space.name}: status="${space.status}", isPending=${isPending}`);
        return isPending;
      });
      console.log("Espaços pendentes encontrados:", pendingSpaces.length);
      console.log("Espaços pendentes:", pendingSpaces);

      setSpaces(spacesWithProfiles as SpaceWithProfileInfo[]);
    } catch (error) {
      console.error("Erro ao buscar espaços:", error);
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
