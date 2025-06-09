
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SpaceWithProfile, SpacePhoto } from "@/types/approval";

export const useSpaceApproval = () => {
  const [spaces, setSpaces] = useState<SpaceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      console.log("Buscando espaços para aprovação...");
      
      const { data: spacesData, error } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          created_at,
          status,
          user_id,
          price,
          phone,
          description,
          address,
          state,
          number,
          zip_code,
          capacity,
          parking,
          wifi,
          sound_system,
          air_conditioning,
          kitchen,
          pool,
          latitude,
          longitude,
          rejection_reason,
          categories,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar espaços:", error);
        toast.error("Erro ao buscar espaços: " + error.message);
        return;
      }

      if (!spacesData || spacesData.length === 0) {
        console.log("Nenhum espaço encontrado");
        setSpaces([]);
        return;
      }

      // Buscar contagem de fotos para cada espaço
      const spacesWithPhotos = await Promise.all(
        spacesData.map(async (space: any) => {
          const { count: photoCount } = await supabase
            .from("space_photos")
            .select("id", { count: "exact" })
            .eq("space_id", space.id);

          return {
            ...space,
            photo_count: photoCount || 0,
          };
        })
      );

      console.log("Espaços processados:", spacesWithPhotos.length);
      setSpaces(spacesWithPhotos);
    } catch (error) {
      console.error("Erro ao buscar espaços:", error);
      toast.error("Erro ao buscar espaços");
    } finally {
      setLoading(false);
    }
  };

  const approveSpace = async (spaceId: string) => {
    try {
      const { error } = await supabase
        .from("spaces")
        .update({ status: "approved" })
        .eq("id", spaceId);

      if (error) throw error;
      
      toast.success("Espaço aprovado com sucesso!");
      await fetchSpaces();
    } catch (error) {
      console.error("Erro ao aprovar espaço:", error);
      toast.error("Erro ao aprovar espaço");
    }
  };

  const rejectSpace = async (spaceId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Motivo da rejeição é obrigatório");
      return;
    }

    try {
      const { error } = await supabase
        .from("spaces")
        .update({
          status: "rejected",
          rejection_reason: reason
        })
        .eq("id", spaceId);

      if (error) throw error;
      
      toast.success("Espaço rejeitado");
      await fetchSpaces();
    } catch (error) {
      console.error("Erro ao rejeitar espaço:", error);
      toast.error("Erro ao rejeitar espaço");
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  return {
    spaces,
    loading,
    fetchSpaces,
    approveSpace,
    rejectSpace
  };
};
