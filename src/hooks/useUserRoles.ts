
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        
        // Diretamente consulte a tabela user_roles sem usar a função RPC
        // que estava causando o problema de recursão
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (error) {
          console.error("Error fetching user roles:", error);
          toast.error("Erro ao verificar permissões do usuário");
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }
        
        // Verifique funções a partir dos dados recuperados
        const hasAdminRole = roles?.some(role => role.role === 'admin') || false;
        const hasSuperAdminRole = roles?.some(role => role.role === 'super_admin') || false;
        
        console.log("User roles retrieved:", { roles, hasAdminRole, hasSuperAdminRole });
        
        setIsAdmin(hasAdminRole);
        setIsSuperAdmin(hasSuperAdminRole);
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
