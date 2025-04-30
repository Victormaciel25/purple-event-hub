
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
        const userId = data.session.user.id;
        
        // Usar uma consulta direta à tabela user_roles para evitar problemas de recursão RLS
        // Esta consulta evita o uso de políticas RLS que dependem de verificações recursivas
        try {
          const { data: adminRole, error: adminError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'admin')
            .maybeSingle();
          
          console.log("Admin role direct check:", adminRole, adminError);
          setIsAdmin(!!adminRole);
          
          if (adminError) {
            console.error("Error in admin role direct check:", adminError);
            setIsAdmin(false);
          }
        } catch (adminError) {
          console.error("Exception in admin role check:", adminError);
          setIsAdmin(false);
        }

        // Verificar o papel super_admin diretamente
        try {
          const { data: superAdminRole, error: superAdminError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'super_admin')
            .maybeSingle();
          
          console.log("Super admin role direct check:", superAdminRole, superAdminError);
          setIsSuperAdmin(!!superAdminRole);
          
          if (superAdminError) {
            console.error("Error in super_admin role direct check:", superAdminError);
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

    // Monitorar mudanças na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUserRoles();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isSuperAdmin, loading };
}
