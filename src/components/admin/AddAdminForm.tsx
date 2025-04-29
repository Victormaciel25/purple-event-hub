
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the form schema using Zod
const formSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAdminFormProps {
  onAdminAdded: () => void;
}

const AddAdminForm = ({ onAdminAdded }: AddAdminFormProps) => {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      
      // Call the function to get the user ID by email
      const { data: userData, error: userError } = await supabase.rpc(
        "get_user_id_by_email",
        { email_input: data.email }
      );
      
      if (userError) throw userError;
      if (!userData) {
        toast.error("Usuário não encontrado");
        return;
      }
      
      // Check if user already has admin role
      const { data: existingRole, error: roleError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userData)
        .eq("role", "admin")
        .single();
        
      if (roleError && !roleError.message.includes("No rows found")) {
        throw roleError;
      }
      
      if (existingRole) {
        toast.error("Usuário já é um administrador");
        return;
      }
      
      // Add admin role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userData,
          role: "admin"
        });
        
      if (insertError) throw insertError;
      
      toast.success("Administrador adicionado com sucesso");
      form.reset();
      onAdminAdded();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast.error(`Erro ao adicionar administrador: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-medium mb-4">Adicionar Administrador</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email do Usuário</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="email@exemplo.com" 
                    type="email" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="bg-iparty" 
            disabled={loading}
          >
            {loading ? "Adicionando..." : "Adicionar Admin"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AddAdminForm;
