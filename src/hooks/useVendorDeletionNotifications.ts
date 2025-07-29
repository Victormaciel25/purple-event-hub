
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorDeletionNotification {
  id: string;
  vendor_name: string;
  deletion_reason: string;
  created_at: string;
  viewed: boolean;
  user_id: string;
}

export const useVendorDeletionNotifications = () => {
  const [notifications, setNotifications] = useState<VendorDeletionNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        // Fetch unviewed vendor deletion notifications
        const { data, error } = await supabase
          .from('vendor_deletion_notifications')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('viewed', false)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching vendor deletion notifications:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const typedData = data as VendorDeletionNotification[];
          setNotifications(typedData);
          
          // Display toast notifications for unviewed notifications (limit to prevent spam)
          const recentNotifications = typedData.slice(0, 3); // Only show last 3
          recentNotifications.forEach((notification: VendorDeletionNotification) => {
            toast.error(`O fornecedor "${notification.vendor_name}" foi excluído: ${notification.deletion_reason}`, {
              duration: 8000,
              onDismiss: () => markNotificationAsViewed(notification.id),
            });
          });
        }
      } catch (err) {
        console.error('Error in useVendorDeletionNotifications:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch notifications on component mount
    fetchNotifications();

    // Set up subscription for real-time notifications
    const channel = supabase
      .channel('vendor-deletion-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'vendor_deletion_notifications'
      }, (payload) => {
        const newNotification = payload.new as VendorDeletionNotification;
        
        // Check if the notification is for the current user before showing toast
        supabase.auth.getUser().then(({ data }) => {
          if (data.user && newNotification.user_id === data.user.id && newNotification.viewed === false) {
            setNotifications((prev) => [newNotification, ...prev]);
            
            toast.error(`O fornecedor "${newNotification.vendor_name}" foi excluído: ${newNotification.deletion_reason}`, {
              duration: 8000,
              onDismiss: () => markNotificationAsViewed(newNotification.id),
            });
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markNotificationAsViewed = async (notificationId: string) => {
    try {
      // Call the secure RPC function to mark notification as viewed
      const { error } = await supabase.rpc('mark_vendor_notification_viewed', {
        notification_id: notificationId
      });

      if (error) {
        console.error('Error marking notification as viewed:', error);
        return;
      }

      // Update local state
      setNotifications((prev) => 
        prev.filter((notification) => notification.id !== notificationId)
      );
    } catch (err) {
      console.error('Error in markNotificationAsViewed:', err);
    }
  };

  return {
    notifications,
    loading,
    markNotificationAsViewed
  };
};
