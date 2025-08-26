import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimeSlot {
  start_t: string;
  end_t: string;
}

export interface AvailabilityData {
  slots: TimeSlot[];
  resource: {
    id: string;
    name: string;
    duration_minutes: number;
    slot_granularity_minutes: number;
  };
}

export const useAvailability = (resourceId: string | null, fromDate: string, toDate: string) => {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAvailability = async () => {
    if (!resourceId || !fromDate || !toDate) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-availability', {
        body: {
          resource_id: resourceId,
          from: fromDate,
          to: toDate,
        },
      });

      if (error) throw error;
      setAvailability(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao carregar disponibilidade",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [resourceId, fromDate, toDate]);

  return {
    availability,
    loading,
    error,
    refetch: fetchAvailability,
  };
};