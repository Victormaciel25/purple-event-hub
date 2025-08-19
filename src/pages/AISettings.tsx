import React, { useState, useEffect } from "react";
import { ArrowLeft, Bot, Building, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Space {
  id: string;
  name: string;
  ai_enabled: boolean;
}

interface Vendor {
  id: string;
  name: string;
  ai_enabled: boolean;
}

interface AISettingsProps {
  onBack: () => void;
}

const AISettings: React.FC<AISettingsProps> = ({ onBack }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      // Fetch user's spaces
      const { data: spacesData, error: spacesError } = await supabase
        .from("spaces")
        .select("id, name, ai_enabled")
        .eq("user_id", session.user.id);

      if (spacesError) throw spacesError;

      // Fetch user's vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from("vendors")
        .select("id, name, ai_enabled")
        .eq("user_id", session.user.id);

      if (vendorsError) throw vendorsError;

      setSpaces(spacesData || []);
      setVendors(vendorsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSpaceAI = async (spaceId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("spaces")
        .update({ ai_enabled: !currentState })
        .eq("id", spaceId);

      if (error) throw error;

      setSpaces(spaces.map(space => 
        space.id === spaceId 
          ? { ...space, ai_enabled: !currentState }
          : space
      ));

      toast({
        title: "Sucesso",
        description: `Chat IA ${!currentState ? 'ativado' : 'desativado'} para este espaço`,
      });
    } catch (error: any) {
      console.error("Error updating space AI:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração da IA",
        variant: "destructive"
      });
    }
  };

  const toggleVendorAI = async (vendorId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ ai_enabled: !currentState })
        .eq("id", vendorId);

      if (error) throw error;

      setVendors(vendors.map(vendor => 
        vendor.id === vendorId 
          ? { ...vendor, ai_enabled: !currentState }
          : vendor
      ));

      toast({
        title: "Sucesso",
        description: `Chat IA ${!currentState ? 'ativado' : 'desativado'} para este fornecedor`,
      });
    } catch (error: any) {
      console.error("Error updating vendor AI:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração da IA",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Bot className="text-primary" size={24} />
        <h1 className="text-2xl font-semibold">Configurações do Chat IA</h1>
      </div>

      <p className="text-muted-foreground mb-6">
        Configure quando o Chat IA deve responder automaticamente às mensagens dos seus clientes.
      </p>

      {/* Spaces Section */}
      {spaces.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building size={20} />
              Meus Espaços
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {spaces.map((space, index) => (
              <React.Fragment key={space.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{space.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {space.ai_enabled ? "IA ativada" : "IA desativada"}
                    </p>
                  </div>
                  <Switch
                    checked={space.ai_enabled}
                    onCheckedChange={() => toggleSpaceAI(space.id, space.ai_enabled)}
                  />
                </div>
                {index < spaces.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vendors Section */}
      {vendors.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase size={20} />
              Meus Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vendors.map((vendor, index) => (
              <React.Fragment key={vendor.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{vendor.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {vendor.ai_enabled ? "IA ativada" : "IA desativada"}
                    </p>
                  </div>
                  <Switch
                    checked={vendor.ai_enabled}
                    onCheckedChange={() => toggleVendorAI(vendor.id, vendor.ai_enabled)}
                  />
                </div>
                {index < vendors.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      {spaces.length === 0 && vendors.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Bot className="mx-auto mb-4 text-muted-foreground" size={48} />
            <h3 className="font-semibold mb-2">Nenhum espaço ou fornecedor encontrado</h3>
            <p className="text-muted-foreground">
              Cadastre um espaço ou fornecedor para configurar o Chat IA.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AISettings;