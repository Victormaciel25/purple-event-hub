
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

        console.log("Session user email:", data.session.user.email);
        const userId = data.session.user.id;
        
        // Simple direct queries without RLS complications
        try {
          // Query for admin role
          const { data: adminRole, error: adminError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'admin')
            .maybeSingle();
          
          console.log("Admin role check response:", !!adminRole, adminError);
          setIsAdmin(!!adminRole);
        } catch (adminError) {
          console.error("Exception in admin role check:", adminError);
          setIsAdmin(false);
        }

        try {
          // Query for super_admin role
          const { data: superAdminRole, error: superAdminError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'super_admin')
            .maybeSingle();
          
          console.log("Super admin role check response:", !!superAdminRole, superAdminError);
          setIsSuperAdmin(!!superAdminRole);
        } catch (superAdminError) {
          console.error("Exception in super_admin role check:", superAdminError);
          setIsSuperAdmin(false);
        }

        // Log final role states for debugging
        console.log("User roles:", {
          isAdmin,
          isSuperAdmin
        });
        
      } catch (error) {
        console.error("Global error in useUserRoles:", error);
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
