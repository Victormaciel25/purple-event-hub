
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
};

const UserSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchUserSpaces();
  }, []);
  
  const fetchUserSpaces = async () => {
    try {
      setLoading(true);
      
      // Obter a sessão do usuário atual
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error("Você precisa estar logado para visualizar seus espaços");
        navigate("/");
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      // Buscar os espaços do usuário atual
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
    // Navegar para a página de edição com o ID do espaço
    navigate(`/edit-space/${spaceId}`);
  };
  
  const handleDelete = async (spaceId: string) => {
    if (!confirm("Tem certeza que deseja excluir este espaço?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Primeiro excluir as fotos relacionadas ao espaço
      const { error: photosError } = await supabase
        .from("space_photos")
        .delete()
        .eq("space_id", spaceId);
      
      if (photosError) throw photosError;
      
      // Depois excluir o espaço
      const { error: spaceError } = await supabase
        .from("spaces")
        .delete()
        .eq("id", spaceId);
      
      if (spaceError) throw spaceError;
      
      toast.success("Espaço excluído com sucesso");
      
      // Atualizar a lista de espaços
      setSpaces(spaces.filter(space => space.id !== spaceId));
    } catch (error) {
      console.error("Erro ao excluir espaço:", error);
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
  
  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected', reason?: string | null) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pendente</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Aprovado</span>;
      case 'rejected':
        return (
          <div className="flex flex-col">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejeitado</span>
            {reason && <span className="text-xs text-red-600 mt-1">{reason}</span>}
          </div>
        );
    }
  };
  
  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
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
        <Card className="p-6 text-center">
          <p className="mb-4">Você ainda não cadastrou nenhum espaço.</p>
          <Button onClick={() => navigate("/register-space")} className="bg-iparty">
            Cadastrar Primeiro Espaço
          </Button>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spaces.map((space) => (
              <TableRow key={space.id}>
                <TableCell className="font-medium">{space.name}</TableCell>
                <TableCell>{space.address}, {space.state}</TableCell>
                <TableCell>{formatPrice(space.price)}</TableCell>
                <TableCell>{formatDate(space.created_at)}</TableCell>
                <TableCell>{getStatusBadge(space.status, space.rejection_reason)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(space.id)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(space.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default UserSpaces;
