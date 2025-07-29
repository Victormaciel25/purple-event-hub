
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUserRoles() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRoles = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserId(null);
          console.log("No session found, user is not authenticated");
          setLoading(false);
          return;
        }

        const currentUserId = sessionData.session.user.id;
        setUserId(currentUserId);
        
        // Query user roles with proper error handling
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId);
          
        if (error) {
          console.error("Error fetching user roles:", error);
          // Don't fallback to hardcoded admin - this was a security vulnerability
          setIsAdmin(false);
          setIsSuperAdmin(false);
          toast.error("Erro ao verificar permissões do usuário");
        } else {
          const hasAdminRole = roles?.some(role => role.role === 'admin') || false;
          const hasSuperAdminRole = roles?.some(role => role.role === 'super_admin') || false;
          
          setIsAdmin(hasAdminRole || hasSuperAdminRole);
          setIsSuperAdmin(hasSuperAdminRole);
        }
      } catch (error) {
        console.error("Global error in useUserRoles:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        toast.error("Erro ao verificar permissões do usuário");
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

  return { isAdmin, isSuperAdmin, loading, userId };
}
