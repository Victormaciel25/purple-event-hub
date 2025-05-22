
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
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
import SingleImageUpload from "@/components/SingleImageUpload";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale"; 
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const dayOptions = [
  { label: 'Segunda', value: 'monday' },
  { label: 'Terça', value: 'tuesday' },
  { label: 'Quarta', value: 'wednesday' },
  { label: 'Quinta', value: 'thursday' },
  { label: 'Sexta', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  category: z.string().min(2, { message: "A categoria é obrigatória" }),
  contactNumber: z.string().min(8, { message: "Insira um número de telefone válido" }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres" }),
  address: z.string().min(5, { message: "Insira um endereço válido" }),
  workingHours: z.string().optional(),
  availableDays: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RegisterVendor = () => {
  const navigate = useNavigate();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      contactNumber: "",
      description: "",
      address: "",
      workingHours: "",
      availableDays: [],
    },
  });

  const handleImageChange = (urls: string[]) => {
    setImageUrls(urls);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prevSelectedDays) => {
      if (prevSelectedDays.includes(day)) {
        return prevSelectedDays.filter((d) => d !== day);
      } else {
        return [...prevSelectedDays, day];
      }
    });
    
    // Update the form with the new selected days
    form.setValue('availableDays', 
      selectedDays.includes(day) 
        ? selectedDays.filter(d => d !== day) 
        : [...selectedDays, day]
    );
  };

  const onSubmit = async (values: FormValues) => {
    if (imageUrls.length === 0) {
      toast.error("Por favor, faça o upload de pelo menos uma imagem");
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

      // Insert vendor data into Supabase using type assertion to bypass TypeScript error
      // This is necessary because the types haven't been updated yet after creating the vendors table
      const { error } = await (supabase
        .from('vendors') as any)
        .insert({
          name: values.name,
          category: values.category, 
          contact_number: values.contactNumber,
          description: values.description,
          address: values.address,
          working_hours: values.workingHours,
          images: imageUrls,
          user_id: userId,
          status: 'pending',
          available_days: selectedDays,
        });
        
      if (error) {
        console.error("Error submitting vendor:", error);
        toast.error("Erro ao cadastrar fornecedor. Tente novamente.");
        return;
      }
      
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
        <p className="text-muted-foreground text-sm mb-2">Imagens do fornecedor</p>
        <SingleImageUpload
          onImageChange={handleImageChange}
          uploadPath="vendors"
          aspectRatio="16:9"
          maxSize={2}
          initialImages={imageUrls}
          isUploading={uploading}
          setIsUploading={setUploading}
          className="w-full"
          maxImages={5}
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
            name="availableDays"
            render={() => (
              <FormItem>
                <FormLabel>Dias Disponíveis</FormLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dayOptions.map((day) => (
                    <Badge
                      key={day.value}
                      variant={selectedDays.includes(day.value) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer hover:bg-secondary transition-colors",
                        selectedDays.includes(day.value) ? "bg-iparty hover:bg-iparty/90" : ""
                      )}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Badge>
                  ))}
                </div>
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
