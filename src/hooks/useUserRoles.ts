
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserRoles() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserRoles = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          return;
        }

        // Check for admin role
        const { data: adminData, error: adminError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin");

        if (adminError) {
          console.error("Error checking admin role:", adminError);
        } else {
          setIsAdmin(adminData && adminData.length > 0);
        }

        // Check for super_admin role
        const { data: superAdminData, error: superAdminError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "super_admin");

        if (superAdminError) {
          console.error("Error checking super admin role:", superAdminError);
        } else {
          setIsSuperAdmin(superAdminData && superAdminData.length > 0);
        }
      } catch (error) {
        console.error("Error in useUserRoles:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRoles();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUserRoles();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isSuperAdmin, loading };
}
