
import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type SpaceDeletionNotification = {
  id: string;
  space_name: string;
  deletion_reason: string;
  created_at: string;
};

const SpaceDeletionAlert = () => {
  const [notification, setNotification] = useState<SpaceDeletionNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkForDeletionNotifications();
  }, []);

  const checkForDeletionNotifications = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("space_deletion_notifications")
        .select("*")
        .eq("viewed", false)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setNotification(data[0]);
        
        // Show toast notification when the alert appears
        toast({
          title: "Aviso importante",
          description: `Seu espaço "${data[0].space_name}" foi excluído.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao verificar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async () => {
    if (!notification) return;
    
    try {
      const { error } = await supabase.rpc(
        'mark_notification_viewed',
        { notification_id: notification.id }
      );
      
      if (error) throw error;
      
      setNotification(null);
    } catch (error) {
      console.error("Erro ao marcar notificação como visualizada:", error);
    }
  };

  if (loading || !notification) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50">
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
          <div>
            <AlertTitle className="text-red-700 font-medium mb-1">
              Espaço excluído: {notification.space_name}
            </AlertTitle>
            <AlertDescription className="text-red-600">
              <p className="mb-1">Motivo: {notification.deletion_reason}</p>
              <p className="text-xs text-red-500/80">
                {new Date(notification.created_at).toLocaleDateString('pt-BR')}
              </p>
            </AlertDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-100" 
          onClick={markAsViewed}
        >
          <X size={18} />
        </Button>
      </div>
    </Alert>
  );
};

export default SpaceDeletionAlert;
