
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
        
        // Fetch admin role using direct database query to avoid RLS issues
        try {
          const { data: adminCheck, error } = await supabase
            .rpc('check_user_role', { 
              user_id: data.session.user.id, 
              requested_role: 'admin' 
            });
            
          console.log("Admin role check response:", adminCheck, error);
          setIsAdmin(!!adminCheck);
          
          if (error) {
            console.error("Error checking admin role:", error);
            setIsAdmin(false);
          }
        } catch (adminError) {
          console.error("Exception in admin role check:", adminError);
          setIsAdmin(false);
        }

        // Fetch super_admin role using direct database query
        try {
          const { data: superAdminCheck, error } = await supabase
            .rpc('check_user_role', { 
              user_id: data.session.user.id, 
              requested_role: 'super_admin' 
            });
            
          console.log("Super admin role check response:", superAdminCheck, error);
          setIsSuperAdmin(!!superAdminCheck);
          
          if (error) {
            console.error("Error checking super_admin role:", error);
            setIsSuperAdmin(false);
          }
        } catch (superAdminError) {
          console.error("Exception in super_admin role check:", superAdminError);
          setIsSuperAdmin(false);
        }
        
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
