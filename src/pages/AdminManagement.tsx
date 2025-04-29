
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import AdminHeader from "@/components/admin/AdminHeader";
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
      <AdminHeader title="Gerenciamento de Administradores" />
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
