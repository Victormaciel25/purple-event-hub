
import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
};

interface AdminsTableProps {
  adminUsers: AdminUser[];
  loading: boolean;
  onAdminRemoved: () => void;
}

const AdminsTable = ({ adminUsers, loading, onAdminRemoved }: AdminsTableProps) => {
  const removeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast.success("Administrador removido com sucesso");
      onAdminRemoved();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Erro ao remover administrador");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <h2 className="text-lg font-medium p-4 flex items-center border-b">
        <Shield className="mr-2 text-iparty" size={24} />
        Administradores
      </h2>

      {loading ? (
        <div className="p-8 text-center">Carregando administradores...</div>
      ) : adminUsers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600">Nenhum administrador encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Adicionado em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminUsers.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  {admin.first_name} {admin.last_name}
                </TableCell>
                <TableCell>{formatDate(admin.created_at)}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAdmin(admin.id)}
                  >
                    <X size={16} className="mr-1" />
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminsTable;
