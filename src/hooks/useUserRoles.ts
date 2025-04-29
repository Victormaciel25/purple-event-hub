
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

        // Check for admin role using has_role function
        const { data: isAdminResult, error: adminError } = await supabase.rpc(
          "has_role",
          { requested_role: "admin" }
        );

        if (adminError) {
          console.error("Error checking admin role:", adminError);
        } else {
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
          setIsSuperAdmin(!!isSuperAdminResult);
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
