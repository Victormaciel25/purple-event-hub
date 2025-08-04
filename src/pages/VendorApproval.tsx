
import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import VendorList from "@/components/approval/VendorList";
import VendorDetails, { VendorDetailsType } from "@/components/approval/VendorDetails";
import { SUPABASE_CONFIG } from "@/config/app-config";
import { validateInput, sanitizeInput } from "@/utils/securityValidation";

type VendorWithProfileInfo = {
  id: string;
  name: string;
  category: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
};

const VendorApproval = () => {
  const [vendors, setVendors] = useState<VendorWithProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<VendorDetailsType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Acesso negado: Permissões de administrador necessárias");
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchVendors();
    }
  }, [isAdmin]);

  const fetchVendors = async () => {
    if (!isAdmin) {
      toast.error("Acesso negado");
      return;
    }

    try {
      setLoading(true);
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(`
          id,
          name,
          category,
          created_at,
          status,
          user_id,
          instagram
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!vendorData || vendorData.length === 0) {
        console.log("Nenhum fornecedor encontrado");
        setVendors([]);
        return;
      }

      // Filtrar fornecedores antigos (aprovados ou rejeitados há mais de 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredVendors = vendorData.filter((vendor: any) => {
        // Se está pendente, sempre mostrar
        if (vendor.status === 'pending' || !vendor.status) {
          return true;
        }
        
        // Se foi aprovado ou rejeitado, verificar se foi há menos de 30 dias
        const vendorDate = new Date(vendor.created_at);
        return vendorDate > thirtyDaysAgo;
      });

      // Buscar perfis separadamente e juntar os dados
      const vendorsWithProfiles: VendorWithProfileInfo[] = [];

      for (const vendor of filteredVendors) {
        // Buscar o perfil associado ao usuário do fornecedor
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", vendor.user_id)
          .single();

        vendorsWithProfiles.push({
          ...vendor,
          profiles: profileData || null
        });
      }

      console.log("Fornecedores processados:", vendorsWithProfiles.length);
      setVendors(vendorsWithProfiles);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast.error("Erro ao buscar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetails = async (vendorId: string) => {
    if (!isAdmin) {
      toast.error("Acesso negado");
      return;
    }

    try {
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(`*`)
        .eq("id", vendorId)
        .single();

      if (error) {
        throw error;
      }

      // Buscar perfil separadamente
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", vendorData.user_id)
        .single();

      // Combinar os dados
      const vendorWithProfile: VendorDetailsType = {
        ...vendorData,
        profiles: profileData || null
      };

      setSelectedVendor(vendorWithProfile);
      setDrawerOpen(true);
      
      // Se o fornecedor tiver imagens, vamos processá-las para exibição
      if (vendorData.images && vendorData.images.length > 0) {
        const urls = vendorData.images;
        setImageUrls(urls);
      } else {
        setImageUrls([]);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do fornecedor:", error);
      toast.error("Erro ao buscar detalhes do fornecedor");
    }
  };

  const sendApprovalNotification = async (vendor: VendorDetailsType, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      console.log("Enviando notificação de aprovação/rejeição para fornecedor:", vendor.id);
      
      const userName = vendor.profiles?.first_name 
        ? `${vendor.profiles.first_name} ${vendor.profiles.last_name || ''}`.trim()
        : 'Usuário';

      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/send-approval-notification`;
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify({
          type: 'vendor',
          itemName: vendor.name,
          userId: vendor.user_id,
          userName: userName,
          status: status,
          rejectionReason: rejectionReason,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send approval notification email:', errorText);
      } else {
        const result = await response.json();
        console.log('Approval notification email sent successfully:', result);
      }
    } catch (error) {
      console.error('Error sending approval notification email:', error);
    }
  };

  const approveVendor = async () => {
    if (!selectedVendor || !isAdmin) {
      toast.error("Acesso negado");
      return;
    }
    
    try {
      setApproving(true);
      
      console.log("Approving vendor with ID:", selectedVendor.id);
      
      // Use our edge function to approve the vendor (with admin privileges)
      const functionUrl = `${SUPABASE_CONFIG.URL}/functions/v1/vendor-approval`;
      
      console.log("Calling edge function at:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_CONFIG.PUBLIC_KEY}`,
        },
        body: JSON.stringify({ vendorId: selectedVendor.id }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Edge function error response:", errorText);
        throw new Error(`Error ${response.status}: ${errorText || "Unknown error"}`);
      }
      
      const result = await response.json();
      console.log("Edge function result:", result);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to approve vendor");
      }
      
      // Send approval notification email
      await sendApprovalNotification(selectedVendor, 'approved');
      
      toast.success("Fornecedor aprovado com sucesso!");
      
      // Update the local state to reflect the approval
      setVendors(prevVendors => 
        prevVendors.map(vendor => 
          vendor.id === selectedVendor.id 
            ? { ...vendor, status: 'approved' as const } 
            : vendor
        )
      );
      
      // Update selected vendor status
      if (selectedVendor) {
        setSelectedVendor({
          ...selectedVendor,
          status: 'approved' as const,
          rejection_reason: null
        });
      }
      
      // Close the details panel
      setTimeout(() => {
        setDrawerOpen(false);
        // Refresh vendor list to get the latest data
        fetchVendors();
      }, 1500);
      
    } catch (error) {
      console.error("Erro ao aprovar fornecedor:", error);
      toast.error("Erro ao aprovar fornecedor");
    } finally {
      setApproving(false);
    }
  };

  const rejectVendor = async () => {
    if (!selectedVendor || !isAdmin) {
      toast.error("Acesso negado");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para rejeição");
      return;
    }

    // Validate rejection reason for security
    const sanitizedReason = sanitizeInput(rejectionReason.trim());
    if (!validateInput(sanitizedReason, 1000)) {
      toast.error("Motivo de rejeição contém conteúdo inválido");
      return;
    }

    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          status: "rejected",
          rejection_reason: sanitizedReason
        })
        .eq("id", selectedVendor.id);

      if (error) throw error;
      
      // Send rejection notification email
      await sendApprovalNotification(selectedVendor, 'rejected', sanitizedReason);
      
      toast.success("Fornecedor rejeitado");
      setDrawerOpen(false);
      setRejectionReason("");
      fetchVendors();
    } catch (error) {
      console.error("Erro ao rejeitar fornecedor:", error);
      toast.error("Erro ao rejeitar fornecedor");
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
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">Aprovação de Fornecedores</h1>
        <div></div> {/* Empty div for spacing */}
      </div>

      <VendorList 
        vendors={vendors} 
        loading={loading} 
        onViewDetails={fetchVendorDetails} 
      />

      {selectedVendor && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="h-[90vh] max-w-4xl mx-auto">
            <DrawerHeader className="text-center">
              <DrawerTitle>{selectedVendor.name}</DrawerTitle>
              <DrawerDescription>
                Submetido por {selectedVendor.profiles?.first_name} {selectedVendor.profiles?.last_name} em {
                  new Date(selectedVendor.created_at).toLocaleDateString('pt-BR')
                }
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-6 pb-6 overflow-y-auto">
              <VendorDetails
                selectedVendor={selectedVendor}
                imageUrls={imageUrls}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                onApprove={approveVendor}
                onReject={rejectVendor}
                onClose={() => setDrawerOpen(false)}
                approving={approving}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default VendorApproval;
