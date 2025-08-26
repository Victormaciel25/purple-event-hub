import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Resource {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  slot_granularity_minutes: number;
  min_notice_hours: number;
  booking_window_days: number;
  daily_capacity: number;
  concurrent_capacity: number;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  tz: string;
  created_at: string;
  updated_at: string;
}

export const useResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao carregar recursos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createResource = async (resourceData: any) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(resourceData)
        .select()
        .single();

      if (error) throw error;
      
      setResources(prev => [data, ...prev]);
      toast({
        title: "Recurso criado",
        description: "Recurso criado com sucesso!",
      });
      
      return data;
    } catch (err: any) {
      toast({
        title: "Erro ao criar recurso",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateResource = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setResources(prev => prev.map(r => r.id === id ? data : r));
      toast({
        title: "Recurso atualizado",
        description: "Recurso atualizado com sucesso!",
      });
      
      return data;
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar recurso",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteResource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setResources(prev => prev.filter(r => r.id !== id));
      toast({
        title: "Recurso excluído",
        description: "Recurso excluído com sucesso!",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao excluir recurso",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return {
    resources,
    loading,
    error,
    refetch: fetchResources,
    createResource,
    updateResource,
    deleteResource,
  };
};