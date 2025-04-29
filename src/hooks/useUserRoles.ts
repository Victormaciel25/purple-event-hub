
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
          console.log("No session found, user is not authenticated");
          setLoading(false);
          return;
        }

        console.log("Checking roles for user:", data.session.user.email);

        // Check for admin role using has_role function
        const { data: isAdminResult, error: adminError } = await supabase.rpc(
          "has_role",
          { requested_role: "admin" }
        );

        if (adminError) {
          console.error("Error checking admin role:", adminError);
        } else {
          console.log("Admin role check result:", isAdminResult);
          setIsAdmin(!!isAdminResult);
        }

        // Check for super_admin role using has_role function
        const { data: isSuperAdminResult, error: superAdminError } = await supabase.rpc(
          "has_role",
          { requested_role: "super_admin" }
        );

        if (superAdminError) {
          console.error("Error checking super admin role:", superAdminError);
        } else {
          console.log("Super admin role check result:", isSuperAdminResult);
          setIsSuperAdmin(!!isSuperAdminResult);
        }
        
        // Also check directly in the user_roles table for debugging
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id);
          
        if (roleError) {
          console.error("Error checking roles table directly:", roleError);
        } else {
          console.log("User roles from database:", roleData);
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
