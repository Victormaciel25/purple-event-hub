
import React, { useState } from "react";
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
import { Card } from "@/components/ui/card";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSpaceApproval } from "@/hooks/useSpaceApproval";
import { useSpacePhotos } from "@/hooks/useSpacePhotos";
import SpacesList from "@/components/approval/SpacesList";
import SpaceDetailsTabs from "@/components/approval/SpaceDetailsTabs";
import SpaceApprovalActions from "@/components/approval/SpaceApprovalActions";
import type { SpaceWithProfile } from "@/types/approval";

const SpaceApproval = () => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceWithProfile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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
      console.log("Selecionando espaço para detalhes:", space);
      setSelectedSpace(space);
      setSheetOpen(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedSpace) return;
    await approveSpace(selectedSpace.id);
    setSheetOpen(false);
  };

  const handleReject = async (reason: string) => {
    if (!selectedSpace) return;
    await rejectSpace(selectedSpace.id, reason);
    setSheetOpen(false);
  };

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

            <div className="mt-6">
              <SpaceDetailsTabs
                space={selectedSpace}
                photoUrls={photoUrls}
                photosLoading={photosLoading}
                onRefreshPhotos={refetchPhotos}
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
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default SpaceApproval;
