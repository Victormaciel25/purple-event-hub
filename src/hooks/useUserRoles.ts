
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
        
        // Use a direct query with explicit user ID to avoid RLS recursion
        // This bypasses RLS policies and uses direct equality checks
        const { data: adminRoles, error: adminError } = await supabase
          .rpc('check_user_role', { 
            user_id: data.session.user.id, 
            requested_role: 'admin' 
          });

        if (adminError) {
          console.error("Error checking admin role:", adminError);
          setIsAdmin(false);
        } else {
          console.log("Admin role check result:", !!adminRoles, adminRoles);
          setIsAdmin(!!adminRoles);
        }

        // Now check if user has super_admin role using RPC
        const { data: superAdminRoles, error: superAdminError } = await supabase
          .rpc('check_user_role', { 
            user_id: data.session.user.id, 
            requested_role: 'super_admin' 
          });

        if (superAdminError) {
          console.error("Error checking super_admin role:", superAdminError);
          setIsSuperAdmin(false);
        } else {
          console.log("Super admin role check result:", !!superAdminRoles, superAdminRoles);
          setIsSuperAdmin(!!superAdminRoles);
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
