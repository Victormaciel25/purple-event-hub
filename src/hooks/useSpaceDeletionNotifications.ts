
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpaceDeletionNotification {
  id: string;
  space_name: string;
  deletion_reason: string;
  created_at: string;
  viewed: boolean;
}

export function useSpaceDeletionNotifications() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkForDeletionNotifications = async () => {
      try {
        // Verificar se o usuário está logado
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setLoading(false);
          return;
        }

        // Buscar notificações de exclusão não visualizadas
        const { data: notifications, error } = await supabase
          .from("space_deletion_notifications")
          .select("*")
          .eq("user_id", sessionData.session.user.id)
          .eq("viewed", false);

        if (error) {
          console.error("Erro ao buscar notificações de exclusão:", error);
          setLoading(false);
          return;
        }

        if (notifications && notifications.length > 0) {
          // Mark notifications as viewed without showing toasts to prevent spam
          notifications.forEach((notification: SpaceDeletionNotification) => {
            markNotificationAsViewed(notification.id);
          });
        }
      } catch (error) {
        console.error("Erro ao verificar notificações:", error);
      } finally {
        setLoading(false);
      }
    };

    // Verificar notificações quando o componente for montado
    checkForDeletionNotifications();

    // Configurar listener para mudanças de estado de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // Verificar notificações quando o usuário fizer login
        setTimeout(() => {
          checkForDeletionNotifications();
        }, 100);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Função para marcar a notificação como visualizada usando função segura
  const markNotificationAsViewed = async (notificationId: string) => {
    try {
      await supabase.rpc("mark_notification_viewed", {
        notification_id: notificationId
      });
    } catch (error) {
      console.error("Erro ao marcar notificação como visualizada:", error);
    }
  };

  return { loading };
}
