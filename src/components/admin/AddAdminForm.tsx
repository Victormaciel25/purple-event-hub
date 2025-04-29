
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddAdminFormProps {
  onAdminAdded: () => void;
}

const AddAdminForm = ({ onAdminAdded }: AddAdminFormProps) => {
  const [email, setEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const addAdmin = async () => {
    if (!email.trim()) {
      toast.error("Por favor, insira um email");
      return;
    }

    try {
      setAddingAdmin(true);

      // First, check if the user exists in auth.users
      const { data: userData, error: userError } = await supabase
        .rpc("get_user_id_by_email", { email_input: email });

      if (userError || !userData) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Then add the admin role
      const { error } = await supabase
        .from("user_roles")
        .insert([
          { user_id: userData, role: "admin" }
        ]);

      if (error) {
        if (error.code === "23505") { // Unique violation
          toast.error("Este usuário já é um administrador");
        } else {
          throw error;
        }
      } else {
        toast.success("Administrador adicionado com sucesso");
        setEmail("");
        onAdminAdded();
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Erro ao adicionar administrador");
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-medium mb-4 flex items-center">
        <ShieldCheck className="mr-2 text-iparty" size={24} />
        Adicionar Administrador
      </h2>
      
      <div className="flex space-x-2">
        <Input
          placeholder="Email do usuário"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <Button
          onClick={addAdmin}
          disabled={addingAdmin || !email.trim()}
        >
          {addingAdmin ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>
    </div>
  );
};

export default AddAdminForm;
