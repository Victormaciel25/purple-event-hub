
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Edit, Trash2, Clock, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type UserSpace = {
  id: string;
  name: string;
  address: string;
  state: string;
  price: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  promotion?: {
    expires_at: string;
    plan_id: string;
  } | null;
};

const UserSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchUserSpaces();
  }, []);
  
  const fetchUserSpaces = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        navigate("/");
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          id, 
          name, 
          address, 
          state, 
          price, 
          created_at, 
          status, 
          rejection_reason,
          space_promotions(expires_at, plan_id)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Process spaces with promotion data
      const processedSpaces = (data || []).map(space => ({
        ...space,
        promotion: space.space_promotions?.find(p => 
          new Date(p.expires_at) > new Date()
        ) || null
      }));
      
      setSpaces(processedSpaces);
    } catch (error) {
      console.error("Erro ao carregar espaços:", error);
      setDeleteError("Erro ao carregar seus espaços");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchUserSpaces();
    toast.info("Atualizando lista de espaços...");
  };
  
  const handleEdit = (spaceId: string) => {
    navigate(`/edit-space/${spaceId}`);
  };
  
  const handleDelete = async (spaceId: string) => {
    if (!confirm("Tem certeza que deseja excluir este espaço?")) {
      return;
    }
    
    try {
      setLoading(true);
      setDeleteError(null);
      
      console.log(`Iniciando processo de exclusão para espaço: ${spaceId}`);
      
      const { error } = await supabase.functions.invoke("delete_space_with_photos", {
        body: { space_id: spaceId }
      });
      
      if (error) {
        console.error("Erro ao excluir espaço:", error);
        throw error;
      }
      
      setSuccessMessage("Espaço excluído com sucesso");
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      setSpaces(spaces.filter(space => space.id !== spaceId));
    } catch (error: any) {
      console.error("Erro ao excluir espaço:", error);
      setDeleteError(error.message || "Erro ao excluir espaço");
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  
  const formatPrice = (value: string) => {
    const numValue = parseFloat(value);
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejeitado</Badge>;
    }
  };

  const getPromotionTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffInHours = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h restantes`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} dias restantes`;
    }
  };

  const pendingCount = spaces.filter(s => s.status === "pending").length;
  const approvedCount = spaces.filter(s => s.status === "approved").length;
  const rejectedCount = spaces.filter(s => s.status === "rejected").length;
  const filteredSpaces = spaces.filter(s => activeTab === "all" ? true : s.status === activeTab);

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
        <h1 className="text-2xl font-semibold">Meus Espaços</h1>
      </div>

      {/* actions */}
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => navigate("/register-space")}
          className="bg-iparty hover:bg-iparty/90"
        >
          <Plus size={16} className="mr-2" /> Cadastrar Espaço
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

      {/* Error and Success Messages */}
      {deleteError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {deleteError}
          </AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        {/* duas colunas por linha */}
        <TabsList className="w-full grid grid-cols-2 gap-2 mb-10">
          <TabsTrigger value="all" className="rounded-md w-full h-full">
            Todos ({spaces.length})
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
                <CardTitle className="text-center">Carregando espaços…</CardTitle>
              </CardHeader>
            </Card>
          ) : filteredSpaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSpaces.map((space) => (
                <Card key={space.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg">{space.name}</h3>
                        <div className="flex gap-2">
                          {getStatusBadge(space.status)}
                          {space.promotion && (
                            <Badge className="bg-yellow-500 text-white">
                              Em Destaque
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {space.promotion && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <Clock size={16} />
                            <span className="text-sm font-medium">
                              Promoção ativa: {getPromotionTimeLeft(space.promotion.expires_at)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Endereço:</p>
                          <p className="truncate" title={`${space.address}, ${space.state}`}>
                            {space.address}, {space.state}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground">Preço:</p>
                          <p className="font-medium">{formatPrice(space.price)}</p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground">Cadastrado em:</p>
                          <p>{formatDate(space.created_at)}</p>
                        </div>
                        
                        {space.status === 'rejected' && space.rejection_reason && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Motivo da rejeição:</p>
                            <p className="text-red-600">{space.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(space.id)}
                      className="flex items-center"
                    >
                      <Edit size={16} className="mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(space.id)}
                      className="flex items-center"
                      disabled={loading}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {activeTab === "all"
                    ? "Você ainda não cadastrou nenhum espaço."
                    : activeTab === "pending"
                    ? "Você não tem espaços pendentes de aprovação."
                    : activeTab === "approved"
                    ? "Você não tem espaços aprovados."
                    : "Você não tem espaços rejeitados."}
                </p>
                {activeTab === "all" && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={() => navigate("/register-space")}
                      className="bg-iparty hover:bg-iparty/90"
                    >
                      <Plus size={16} className="mr-2" /> Cadastrar Espaço
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

export default UserSpaces;
