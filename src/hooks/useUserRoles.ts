
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
        
        // Direct database query without using RLS functions to avoid recursion
        // Query for admin role
        const { data: adminRoles, error: adminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'admin');

        if (adminError) {
          console.error("Error checking admin role:", adminError);
        } else {
          const hasAdminRole = adminRoles && adminRoles.length > 0;
          console.log("Admin role check result:", hasAdminRole);
          setIsAdmin(hasAdminRole);
        }

        // Query for super_admin role
        const { data: superAdminRoles, error: superAdminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'super_admin');

        if (superAdminError) {
          console.error("Error checking super_admin role:", superAdminError);
        } else {
          const hasSuperAdminRole = superAdminRoles && superAdminRoles.length > 0;
          console.log("Super admin role check result:", hasSuperAdminRole);
          setIsSuperAdmin(hasSuperAdminRole);
        }
        
        // Log all roles for debugging
        const { data: allRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id);
          
        if (rolesError) {
          console.error("Error checking all roles:", rolesError);
        } else {
          console.log("All user roles from database:", allRoles);
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
