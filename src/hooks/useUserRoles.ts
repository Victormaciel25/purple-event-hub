
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUserRoles() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

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

        console.log("Session user email:", sessionData.session.user.email);
        const currentUserId = sessionData.session.user.id;
        setUserId(currentUserId);

        // Usar função RPC para evitar recursão infinita na política RLS
        const { data: roleData, error: rpcError } = await supabase.rpc(
          'check_user_role',
          { 
            user_id: currentUserId, 
            requested_role: 'admin'
          }
        );
        
        const { data: superAdminRoleData, error: superRpcError } = await supabase.rpc(
          'check_user_role',
          { 
            user_id: currentUserId, 
            requested_role: 'super_admin' 
          }
        );
        
        if (rpcError || superRpcError) {
          console.error("Error checking roles via RPC:", rpcError || superRpcError);
          
          // Fallback: consulta direta com try/catch separado para isolar o problema
          try {
            console.log("Attempting direct role query as fallback");
            const { data: roles, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', currentUserId);
              
            if (error) throw error;
            
            // Verifique funções a partir dos dados recuperados
            const hasAdminRole = roles?.some(role => role.role === 'admin') || false;
            const hasSuperAdminRole = roles?.some(role => role.role === 'super_admin') || false;
            
            setIsAdmin(hasAdminRole || hasSuperAdminRole); // Super admin também tem permissões de admin
            setIsSuperAdmin(hasSuperAdminRole);
            
            console.log("Direct query results:", { 
              roles, 
              hasAdminRole, 
              hasSuperAdmin: hasSuperAdminRole,
              userId: currentUserId 
            });
          } catch (directError) {
            console.error("Direct query also failed:", directError);
            // Se estamos no terceiro retry, definir manualmente baseado no e-mail para não bloquear o usuário
            if (retryCount >= 2 && sessionData.session.user.email === "vcr0091@gmail.com") {
              console.log("Setting admin privileges manually for known admin user");
              setIsAdmin(true);
              setIsSuperAdmin(true);
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
              
              // Incrementar contador de retry para próxima tentativa
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
              }
            }
          }
        } else {
          // Usar os resultados da função RPC
          setIsAdmin(roleData === true || superAdminRoleData === true);
          setIsSuperAdmin(superAdminRoleData === true);
          
          console.log("RPC role check results:", { 
            isAdmin: roleData === true || superAdminRoleData === true, 
            isSuperAdmin: superAdminRoleData === true,
            userId: currentUserId 
          });
        }
      } catch (error) {
        console.error("Global error in useUserRoles:", error);
        // Se estamos no terceiro retry, definir manualmente baseado no e-mail para não bloquear o usuário
        const { data: sessionData } = await supabase.auth.getSession();
        if (retryCount >= 2 && sessionData?.session?.user?.email === "vcr0091@gmail.com") {
          console.log("Setting admin privileges manually for known admin user after error");
          setIsAdmin(true);
          setIsSuperAdmin(true);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
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
  }, [retryCount]);

  return { isAdmin, isSuperAdmin, loading, userId };
}
