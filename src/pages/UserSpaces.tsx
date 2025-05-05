import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UserSpace = {
  id: string;
  name: string;
  address: string;
  state: string;
  price: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
};

const UserSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchUserSpaces();
  }, []);
  
  const fetchUserSpaces = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error("Você precisa estar logado para visualizar seus espaços");
        navigate("/");
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name, address, state, price, created_at, status, rejection_reason")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setSpaces(data || []);
    } catch (error) {
      console.error("Erro ao carregar espaços:", error);
      toast.error("Erro ao carregar seus espaços");
    } finally {
      setLoading(false);
    }
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
      
      // Usando uma RPC (Remote Procedure Call) para executar a exclusão no lado do servidor
      // Isso garante que todas as fotos sejam excluídas antes do espaço ser removido
      const { error } = await supabase.rpc('delete_space_with_photos', {
        space_id_param: spaceId
      });
      
      if (error) {
        console.error("Erro ao excluir espaço:", error);
        throw error;
      }
      
      toast.success("Espaço excluído com sucesso");
      
      // Update local state to remove the deleted space
      setSpaces(spaces.filter(space => space.id !== spaceId));
    } catch (error: any) {
      console.error("Erro ao excluir espaço:", error);
      setDeleteError(error.message || "Erro ao excluir espaço");
      toast.error("Erro ao excluir espaço");
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

  const renderEmptyState = () => (
    <Card className="p-6 text-center">
      <p className="mb-4">Você ainda não cadastrou nenhum espaço.</p>
      <Button onClick={() => navigate("/register-space")} className="bg-iparty">
        Cadastrar Primeiro Espaço
      </Button>
    </Card>
  );

  const renderSpaceCards = () => (
    <ScrollArea className="h-[calc(100vh-220px)]">
      {deleteError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {deleteError}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
        {spaces.map((space) => (
          <Card key={space.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg">{space.name}</h3>
                  {getStatusBadge(space.status)}
                </div>
                
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
    </ScrollArea>
  );
  
  return (
    <div className="container px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Meus Espaços</h1>
        </div>
        <Button onClick={() => navigate("/register-space")} className="bg-iparty">
          Cadastrar Novo Espaço
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p>Carregando seus espaços...</p>
        </div>
      ) : spaces.length === 0 ? (
        renderEmptyState()
      ) : (
        renderSpaceCards()
      )}
    </div>
  );
};

export default UserSpaces;
