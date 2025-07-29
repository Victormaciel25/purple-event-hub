
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import VendorCard from "@/components/VendorCard";

const UserVendors = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }
      
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching vendors:", error);
        throw error;
      }
      
      setVendors(data || []);
    } catch (err) {
      console.error("Error in fetchVendors:", err);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [navigate]);

  const handleRefresh = () => {
    fetchVendors();
    toast.info("Atualizando lista de fornecedores...");
  };

  const pendingCount = vendors.filter(v => v.status === "pending").length;
  const approvedCount = vendors.filter(v => v.status === "approved").length;
  const rejectedCount = vendors.filter(v => v.status === "rejected").length;
  const filteredVendors = vendors.filter(v => activeTab === "all" ? true : v.status === activeTab);

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold">Meus Fornecedores</h1>
      </div>

      {/* actions */}
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => navigate("/register-vendor")}
          className="bg-iparty hover:bg-iparty/90"
        >
          <Plus size={16} className="mr-2" /> Cadastrar Fornecedor
        </Button>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 gap-2 mb-10">
          <TabsTrigger value="all" className="rounded-md w-full h-full">
            Todos ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-md w-full h-full">
            Pendentes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-md w-full h-full"
          >
            Aprovados ({approvedCount})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-md w-full h-full"
          >
            Rejeitados ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Carregando fornecedores…</CardTitle>
              </CardHeader>
            </Card>
          ) : filteredVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.name}
                  category={vendor.category}
                  rating={0}
                  contactNumber={vendor.contact_number}
                  image={vendor.images?.[0] ?? "/placeholder.svg"}
                  status={vendor.status}
                  showEditButton={true}
                  address={vendor.address}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {activeTab === "all"
                    ? "Você ainda não cadastrou nenhum fornecedor."
                    : activeTab === "pending"
                    ? "Você não tem fornecedores pendentes de aprovação."
                    : activeTab === "approved"
                    ? "Você não tem fornecedores aprovados."
                    : "Você não tem fornecedores rejeitados."}
                </p>
                {activeTab === "all" && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={() => navigate("/register-vendor")}
                      className="bg-iparty hover:bg-iparty/90"
                    >
                      <Plus size={16} className="mr-2" /> Cadastrar Fornecedor
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserVendors;
