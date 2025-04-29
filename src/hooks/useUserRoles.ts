
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
        
        // Use a direct query approach to avoid RLS recursion issues
        // Don't use RPC functions or policies that might trigger recursion
        
        // First check if the user has admin role
        const { data: adminRoles, error: adminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'admin');

        if (adminError) {
          console.error("Error checking admin role:", adminError);
          setIsAdmin(false);
        } else {
          // Check if we got any results back
          const hasAdminRole = adminRoles && adminRoles.length > 0;
          console.log("Admin role check result:", hasAdminRole, adminRoles);
          setIsAdmin(hasAdminRole);
        }

        // Now check if user has super_admin role
        const { data: superAdminRoles, error: superAdminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'super_admin');

        if (superAdminError) {
          console.error("Error checking super_admin role:", superAdminError);
          setIsSuperAdmin(false);
        } else {
          // Check if we got any results back
          const hasSuperAdminRole = superAdminRoles && superAdminRoles.length > 0;
          console.log("Super admin role check result:", hasSuperAdminRole, superAdminRoles);
          setIsSuperAdmin(hasSuperAdminRole);
        }
        
        // Log all user roles for debugging
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
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
