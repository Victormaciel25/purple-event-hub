
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SpaceDeletion = {
  id: string;
  space_name: string;
  deletion_reason: string;
  created_at: string;
  viewed: boolean;
};

export function useSpaceDeletions() {
  const [deletions, setDeletions] = useState<SpaceDeletion[]>([]);
  const [loading, setLoading] = useState(true);

  // Load space deletion notifications for the current user
  const fetchDeletions = async () => {
    try {
      setLoading(true);

      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      // Fetch unviewed notifications
      const { data, error } = await supabase
        .from("space_deletion_notifications")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .eq("viewed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeletions(data || []);
    } catch (error) {
      console.error("Error fetching space deletion notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as viewed
  const markAsViewed = async (notificationId: string) => {
    try {
      // Use the RPC function to mark as viewed
      const { error } = await supabase.rpc(
        "mark_notification_viewed",
        { notification_id: notificationId }
      );

      if (error) throw error;
      
      // Update local state
      setDeletions(deletions.filter(item => item.id !== notificationId));
      
      return true;
    } catch (error) {
      console.error("Error marking notification as viewed:", error);
      return false;
    }
  };

  // Show alert for unviewed deletion notifications
  const showDeletionAlerts = () => {
    deletions.forEach(deletion => {
      toast.error(
        `Seu espaço "${deletion.space_name}" foi excluído. Motivo: ${deletion.deletion_reason}`,
        {
          duration: 10000,
          onDismiss: () => markAsViewed(deletion.id)
        }
      );
    });
  };

  return { 
    deletions, 
    loading, 
    fetchDeletions, 
    markAsViewed,
    showDeletionAlerts 
  };
}
