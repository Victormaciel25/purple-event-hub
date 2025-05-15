
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DeletionNotification = {
  id: string;
  space_name: string;
  deletion_reason: string;
  created_at: string;
  viewed: boolean;
};

const DeletionNotifications = () => {
  const [notifications, setNotifications] = useState<DeletionNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        return;
      }
      
      const { data, error } = await supabase
        .from("space_deletion_notifications")
        .select("*")
        .eq("viewed", false)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsViewed = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc(
        'mark_notification_viewed',
        { notification_id: notificationId }
      );
      
      if (error) throw error;
      
      // Atualiza localmente
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Erro ao marcar notificação como visualizada:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {notifications.map((notification) => (
        <Alert key={notification.id} variant="destructive" className="mb-2">
          <div className="flex justify-between items-start">
            <div>
              <AlertTitle className="font-medium">
                Espaço excluído: {notification.space_name}
              </AlertTitle>
              <AlertDescription>
                <p className="mt-1">Motivo: {notification.deletion_reason}</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {formatDate(notification.created_at)}
                </p>
              </AlertDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 h-auto" 
              onClick={() => markNotificationAsViewed(notification.id)}
            >
              <X size={16} />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default DeletionNotifications;
