
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
        
        // First try: Use RPC functions with proper parameters to prevent recursion
        try {
          // Get admin role
          const { data: adminRole, error: adminError } = await supabase.rpc(
            'check_user_role',
            { 
              user_id: currentUserId, 
              requested_role: 'admin'
            }
          );
          
          // Get super_admin role
          const { data: superAdminRole, error: superAdminError } = await supabase.rpc(
            'check_user_role',
            { 
              user_id: currentUserId, 
              requested_role: 'super_admin' 
            }
          );
          
          if (adminError || superAdminError) {
            throw new Error(`RPC Error: ${adminError?.message || superAdminError?.message}`);
          }
          
          setIsAdmin(Boolean(adminRole) || Boolean(superAdminRole)); // Super admin also has admin privileges
          setIsSuperAdmin(Boolean(superAdminRole));
          
        } catch (rpcError) {
          console.warn("RPC role check failed, using direct query:", rpcError);
          
          // Second try: Direct database query as fallback
          // This is done in a separate transaction to avoid triggering the recursion
          const { data: roles, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUserId);
            
          if (error) {
            console.error("Direct query also failed:", error);
            
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
