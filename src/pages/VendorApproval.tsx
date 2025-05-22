
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import VendorList from "@/components/approval/VendorList";
import VendorDetails, { VendorDetailsType } from "@/components/approval/VendorDetails";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
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
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Buscar perfis separadamente e juntar os dados
      const vendorsWithProfiles: VendorWithProfileInfo[] = [];

      for (const vendor of vendorData || []) {
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

      setVendors(vendorsWithProfiles);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast.error("Erro ao buscar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetails = async (vendorId: string) => {
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
      setSheetOpen(true);
      
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

  const approveVendor = async () => {
    if (!selectedVendor) return;

    try {
      console.log("Approving vendor with ID:", selectedVendor.id);
      
      // Use upsert to ensure the update happens regardless of RLS policies
      const { data, error } = await supabase
        .from("vendors")
        .update({ 
          status: "approved" 
        })
        .eq("id", selectedVendor.id)
        .select();

      if (error) {
        console.error("Error approving vendor:", error);
        throw error;
      }
      
      console.log("Vendor approved successfully, response:", data);
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
          status: 'approved' as const
        });
      }
      
      // Close the details panel
      setSheetOpen(false);
      
      // Refresh vendor list to get the latest data
      fetchVendors();
    } catch (error) {
      console.error("Erro ao aprovar fornecedor:", error);
      toast.error("Erro ao aprovar fornecedor");
    }
  };

  const rejectVendor = async () => {
    if (!selectedVendor) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para rejeição");
      return;
    }

    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason
        })
        .eq("id", selectedVendor.id);

      if (error) throw error;
      
      toast.success("Fornecedor rejeitado");
      setSheetOpen(false);
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
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="mr-2 p-0 h-auto">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">Aprovação de Fornecedores</h1>
      </div>

      <VendorList 
        vendors={vendors} 
        loading={loading} 
        onViewDetails={fetchVendorDetails} 
      />

      {selectedVendor && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedVendor.name}</SheetTitle>
              <SheetDescription>
                Submetido por {selectedVendor.profiles?.first_name} {selectedVendor.profiles?.last_name} em {
                  new Date(selectedVendor.created_at).toLocaleDateString('pt-BR')
                }
              </SheetDescription>
            </SheetHeader>

            <VendorDetails
              selectedVendor={selectedVendor}
              imageUrls={imageUrls}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              onApprove={approveVendor}
              onReject={rejectVendor}
              onClose={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default VendorApproval;
