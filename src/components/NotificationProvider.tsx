import React from 'react';
import { useSpaceDeletionNotifications } from '@/hooks/useSpaceDeletionNotifications';
import { useVendorDeletionNotifications } from '@/hooks/useVendorDeletionNotifications';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  useSpaceDeletionNotifications();
  useVendorDeletionNotifications();

  return <>{children}</>;
};