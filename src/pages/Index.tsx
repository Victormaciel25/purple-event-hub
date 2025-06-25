
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Verificar se há parâmetros de URL que indicam recuperação de senha PRIMEIRO
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        console.log("Index - URL params:", { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
        
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log("Index - Password recovery detected, redirecting to reset-password");
          setIsPasswordRecovery(true);
          setLoading(false);
          return;
        }
        
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // Se é recuperação de senha, redirecionar para reset-password
  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  // If user is authenticated, redirect to explore, otherwise to login
  return session ? <Navigate to="/explore" replace /> : <Navigate to="/login" replace />;
};

export default Index;
