
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        
        // Se o usuário estiver autenticado, verificar notificações não visualizadas
        if (data.session) {
          checkForDeletionNotifications();
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const checkForDeletionNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("space_deletion_notifications")
        .select("space_name")
        .eq("viewed", false)
        .limit(1);
      
      if (error) {
        console.error("Erro ao verificar notificações:", error);
        return;
      }
      
      // Se houver notificações não visualizadas, mostrar um toast
      if (data && data.length > 0) {
        toast.warning("Você tem notificações sobre espaços excluídos. Confira na página 'Meus Espaços'.", {
          duration: 6000
        });
      }
    } catch (error) {
      console.error("Erro ao verificar notificações:", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // If user is authenticated, redirect to explore, otherwise to login
  return session ? <Navigate to="/explore" replace /> : <Navigate to="/login" replace />;
};

export default Index;
