import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Hold {
  id: string;
  resource_id: string;
  start_t: string;
  end_t: string;
  expires_at: string;
  status: 'active' | 'expired';
}

export interface Booking {
  id: string;
  resource_id: string;
  start_t: string;
  end_t: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
  total_amount?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createHold = async (resourceId: string, startTime: string, endTime: string): Promise<Hold | null> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-hold', {
        body: {
          resource_id: resourceId,
          start_t: startTime,
          end_t: endTime,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Horário reservado temporariamente",
        description: "Você tem 15 minutos para confirmar a reserva.",
      });

      return data.hold;
    } catch (err: any) {
      toast({
        title: "Erro ao reservar horário",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (
    holdId: string,
    customerData: {
      name: string;
      email: string;
      phone?: string;
      notes?: string;
    }
  ): Promise<Booking | null> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('confirm-booking', {
        body: {
          hold_id: holdId,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          notes: customerData.notes,
        },
      });

      if (error) throw error;
      
      toast({
        title: "Reserva confirmada!",
        description: "Sua reserva foi confirmada com sucesso.",
      });

      return data.booking;
    } catch (err: any) {
      toast({
        title: "Erro ao confirmar reserva",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createHold,
    confirmBooking,
  };
};