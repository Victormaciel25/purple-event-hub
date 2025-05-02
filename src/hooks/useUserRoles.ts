
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
        
        // Agora com a política que permite SELECT para todos, podemos
        // consultar diretamente a tabela user_roles sem causar recursão
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId);
          
        if (error) {
          console.error("Error fetching user roles:", error);
          
          // Special case for known admin - safety mechanism
          if (sessionData.session.user.email === "vcr0091@gmail.com") {
            setIsAdmin(true);
            setIsSuperAdmin(true);
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
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
