import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import AddAdminForm from "@/components/admin/AddAdminForm";
import AdminsTable, { AdminUser } from "@/components/admin/AdminsTable";

const AdminManagement = () => {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
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
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return <div className="container px-4 py-6 flex items-center justify-center h-[80vh]">Carregando...</div>;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
          <ChevronLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">Gerenciamento de Administradores</h2>
        <div></div> {/* Empty div for spacing */}
      </div>
      
      <AddAdminForm onAdminAdded={fetchAdmins} />
      <AdminsTable 
        adminUsers={adminUsers}
        loading={loading} 
        onAdminRemoved={fetchAdmins}
      />
    </div>
  );
};

export default AdminManagement;
