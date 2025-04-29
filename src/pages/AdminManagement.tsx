
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck, User, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
};

const AdminManagement = () => {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const { isSuperAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/profile");
    }
  }, [isSuperAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          role,
          created_at,
          user_id,
          profiles:profiles!user_id(
            id,
            email:id,
            first_name,
            last_name
          )
        `)
        .eq("role", "admin");

      if (error) throw error;

      // Transform the data into a more usable format
      const adminData: AdminUser[] = data.map((item: any) => ({
        id: item.user_id,
        email: item.profiles.email || "N/A",
        role: item.role,
        created_at: item.created_at,
        first_name: item.profiles.first_name || null,
        last_name: item.profiles.last_name || null,
      }));

      setAdminUsers(adminData);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Erro ao buscar administradores");
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!email.trim()) {
      toast.error("Por favor, insira um email");
      return;
    }

    try {
      setAddingAdmin(true);

      // First, check if the user exists in auth.users
      // We can't query auth.users directly, so we'll look for a profile with matching auth_id
      const { data: userData, error: userError } = await supabase
        .rpc("get_user_id_by_email", { email_input: email });

      if (userError || !userData) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Then add the admin role
      const { error } = await supabase
        .from("user_roles")
        .insert([
          { user_id: userData, role: "admin" }
        ]);

      if (error) {
        if (error.code === "23505") { // Unique violation
          toast.error("Este usuário já é um administrador");
        } else {
          throw error;
        }
      } else {
        toast.success("Administrador adicionado com sucesso");
        setEmail("");
        fetchAdmins();
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Erro ao adicionar administrador");
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast.success("Administrador removido com sucesso");
      fetchAdmins();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Erro ao remover administrador");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (roleLoading) {
    return <div className="container px-4 py-6 flex items-center justify-center h-[80vh]">Carregando...</div>;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="mr-2 p-0 h-auto">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">Gerenciamento de Administradores</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <ShieldCheck className="mr-2 text-iparty" size={24} />
          Adicionar Administrador
        </h2>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Email do usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <Button
            onClick={addAdmin}
            disabled={addingAdmin || !email.trim()}
          >
            {addingAdmin ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </div>

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
    </div>
  );
};

export default AdminManagement;
