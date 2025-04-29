
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
        
        // Instead of using has_role function which might be having issues,
        // directly query the user_roles table with explicit column references
        const { data: adminRoles, error: adminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'admin')
          .single();

        if (adminError && adminError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error("Error checking admin role:", adminError);
        } else {
          const hasAdminRole = !!adminRoles;
          console.log("Admin role check result:", hasAdminRole);
          setIsAdmin(hasAdminRole);
        }

        // Check for super_admin role directly in the table
        const { data: superAdminRoles, error: superAdminError } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', data.session.user.id)
          .eq('role', 'super_admin')
          .single();

        if (superAdminError && superAdminError.code !== 'PGRST116') {
          console.error("Error checking super admin role:", superAdminError);
        } else {
          const hasSuperAdminRole = !!superAdminRoles;
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
