
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
      console.log("Fetching admins...");
      
      // First get all admin user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "admin");

      if (rolesError) {
        console.error("Error fetching admin roles:", rolesError);
        throw rolesError;
      }

      console.log("Admin roles found:", adminRoles);

      if (!adminRoles || adminRoles.length === 0) {
        console.log("No admin roles found");
        setAdminUsers([]);
        setLoading(false);
        return;
      }

      // Get user IDs
      const userIds = adminRoles.map(role => role.user_id);
      console.log("User IDs to fetch:", userIds);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      console.log("Profiles found:", profiles);

      // Get user emails using the edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('get_admin_emails', {
        body: { userIds }
      });

      if (emailError) {
        console.error("Error fetching emails:", emailError);
        throw emailError;
      }

      console.log("Email data:", emailData);

      // Combine all data
      const adminData: AdminUser[] = adminRoles.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        const emailInfo = emailData?.emails?.find((e: any) => e.userId === role.user_id);
        
        return {
          id: role.user_id,
          email: emailInfo?.email || "Email não encontrado",
          role: role.role,
          created_at: role.created_at,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
        };
      });

      console.log("Final admin data:", adminData);
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
        <h1 className="text-base font-bold absolute left-1/2 transform -translate-x-1/2">Gerenciamento de Administradores</h1>
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
