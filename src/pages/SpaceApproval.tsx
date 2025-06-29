import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSpaceApproval } from "@/hooks/useSpaceApproval";
import { useSpacePhotos } from "@/hooks/useSpacePhotos";
import SpacesList from "@/components/approval/SpacesList";
import SpaceDetailsTabs from "@/components/approval/SpaceDetailsTabs";
import SpaceApprovalActions from "@/components/approval/SpaceApprovalActions";
import type { SpaceWithProfile } from "@/types/approval";
import { toast } from "sonner";
import { SUPABASE_CONFIG } from "@/config/app-config";

const SpaceApproval = () => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceWithProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();
  
  const { spaces, loading, approveSpace, rejectSpace } = useSpaceApproval();
  const { photoUrls, loading: photosLoading, refetch: refetchPhotos } = useSpacePhotos(selectedSpace?.id || null);

  React.useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  const handleViewDetails = async (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
      console.log("🎯 Selecionando espaço para detalhes:", space);
      
      // Primeiro limpar o estado anterior
      setSelectedSpace(null);
      setDrawerOpen(false);
      
      // Pequeno delay para garantir que o estado seja limpo antes de definir o novo
      setTimeout(() => {
        setSelectedSpace(space);
        setDrawerOpen(true);
        console.log("📂 Drawer aberto para espaço:", space.id);
      }, 50);
    }
  };

  const handleApprove = async () => {
    if (!selectedSpace) return;
    await approveSpace(selectedSpace.id);
    setDrawerOpen(false);
  };

  const handleReject = async (reason: string) => {
    if (!selectedSpace) return;
    await rejectSpace(selectedSpace.id, reason);
    setDrawerOpen(false);
  };

  const handleDeleteSpace = async (spaceId: string, deletionReason: string) => {
    try {
      console.log("=== INICIANDO EXCLUSÃO DE ESPAÇO ===");
      console.log("ID do espaço:", spaceId);
      console.log("Motivo da exclusão:", deletionReason);
      
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/delete_space_with_notification`;
      console.log("URL da função:", functionUrl);
      
      const requestBody = { 
        space_id: spaceId,
        deletion_reason: deletionReason
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
      setDrawerOpen(false);
      
      // Refresh the spaces list
      window.location.reload();
    } catch (error) {
      console.error("Erro ao excluir espaço:", error);
      toast.error("Erro ao excluir espaço: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    }
  };

  // Log quando as fotos mudam
  React.useEffect(() => {
    if (selectedSpace) {
      console.log("📸 Estado das fotos para espaço", selectedSpace.id, ":", {
        photoUrls: photoUrls,
        count: photoUrls?.length || 0,
        loading: photosLoading
      });
    }
  }, [photoUrls, photosLoading, selectedSpace]);

  if (roleLoading) {
    return (
      <div className="container px-4 py-6 flex items-center justify-center h-[80vh]">
        Carregando...
      </div>
    );
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
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">
          Aprovação de Espaços
        </h1>
        <div></div>
      </div>

      <SpacesList 
        spaces={spaces} 
        loading={loading} 
        onViewDetails={handleViewDetails} 
      />

      {selectedSpace && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="h-[90vh] max-w-4xl mx-auto">
            <DrawerHeader className="text-center">
              <DrawerTitle>{selectedSpace.name}</DrawerTitle>
              <DrawerDescription>
                Submetido por {selectedSpace.profiles?.first_name} {selectedSpace.profiles?.last_name} em {
                  new Date(selectedSpace.created_at).toLocaleDateString('pt-BR')
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-6 pb-6 overflow-y-auto">
              <SpaceDetailsTabs
                space={selectedSpace}
                photoUrls={photoUrls}
                photosLoading={photosLoading}
                onRefreshPhotos={refetchPhotos}
                onDelete={handleDeleteSpace}
              />

              {selectedSpace.status === "pending" && (
                <div className="mt-6">
                  <SpaceApprovalActions
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={loading}
                  />
                </div>
              )}
              
              {selectedSpace.status === "rejected" && (
                <Card className="mt-6 p-4 bg-red-50 border-red-200">
                  <h4 className="font-medium text-red-700">Motivo da rejeição:</h4>
                  <p className="text-red-600">
                    {selectedSpace.rejection_reason || "Nenhum motivo fornecido"}
                  </p>
                </Card>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default SpaceApproval;
