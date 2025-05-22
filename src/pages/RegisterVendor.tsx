
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  category: z.string().min(2, { message: "A categoria é obrigatória" }),
  contactNumber: z.string().min(8, { message: "Insira um número de telefone válido" }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres" }),
  address: z.string().min(5, { message: "Insira um endereço válido" }),
  workingHours: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RegisterVendor = () => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      contactNumber: "",
      description: "",
      address: "",
      workingHours: "",
    },
  });

  const handleImageChange = (url: string | null) => {
    setImageUrl(url);
  };

  const onSubmit = async (values: FormValues) => {
    if (!imageUrl) {
      toast.error("Por favor, faça o upload de uma imagem");
      return;
    }

    setSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        toast.error("Você precisa estar logado para cadastrar um fornecedor");
        navigate("/login");
        return;
      }

      const userId = session.session.user.id;

      // This would be replaced with actual API integration in a real app
      // For now, we're just simulating success
      
      // Simulating a server delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Fornecedor cadastrado com sucesso!");
      navigate(-1);
    } catch (error) {
      console.error("Error submitting vendor:", error);
      toast.error("Erro ao cadastrar fornecedor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4 pl-0 flex items-center text-gray-600"
      >
        <ArrowLeft size={20} className="mr-1" />
        <span>Voltar</span>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Cadastrar Fornecedor</h1>
      
      <div className="mb-6">
        <p className="text-muted-foreground text-sm mb-2">Imagem do fornecedor</p>
        <ImageUpload
          onImageChange={handleImageChange}
          uploadPath="vendors"
          aspectRatio="1:1"
          maxSize={2}
          initialImage={imageUrl}
          isUploading={uploading}
          setIsUploading={setUploading}
          className="w-full h-48 rounded-lg"
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Fornecedor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Buffet Delicias" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Buffet, DJ, Fotografia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Contato</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-8888" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input placeholder="Av. Paulista, 1000 - São Paulo, SP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Funcionamento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 09:00 - 18:00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Conte um pouco sobre este fornecedor e os serviços oferecidos" 
                    className="min-h-[120px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-iparty hover:bg-iparty/90" 
            disabled={submitting || uploading}
          >
            {submitting ? "Cadastrando..." : "Cadastrar Fornecedor"}
          </Button>
        </form>
      </Form>

      <div className="h-20"></div> {/* Space for bottom nav */}
    </div>
  );
};

export default RegisterVendor;
