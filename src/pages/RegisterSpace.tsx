
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Home, Phone, MapPin, Info, DollarSign, Users, List, Check, ChevronRight, ArrowLeft, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import LocationMap from "@/components/LocationMap";
import ImageUpload from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the form schema using Zod
const formSchema = z.object({
  name: z.string().min(3, { message: "Nome do espaço deve ter pelo menos 3 caracteres" }),
  phone: z.string().min(10, { message: "Telefone inválido" }),
  state: z.string().min(2, { message: "Estado é obrigatório" }),
  address: z.string().min(5, { message: "Endereço é obrigatório" }),
  zipCode: z.string().min(8, { message: "CEP inválido" }),
  number: z.string().min(1, { message: "Número é obrigatório" }),
  description: z.string().min(20, { message: "Descrição deve ter pelo menos 20 caracteres" }),
  price: z.string().min(1, { message: "Valor é obrigatório" }),
  capacity: z.string().min(1, { message: "Capacidade é obrigatória" }),
  // Amenidades
  parking: z.boolean().default(false),
  wifi: z.boolean().default(false),
  soundSystem: z.boolean().default(false),
  airConditioning: z.boolean().default(false),
  kitchen: z.boolean().default(false),
  pool: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const RegisterSpace = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<FormValues>>({});
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      state: "",
      address: "",
      zipCode: "",
      number: "",
      description: "",
      price: "",
      capacity: "",
      parking: false,
      wifi: false,
      soundSystem: false,
      airConditioning: false,
      kitchen: false,
      pool: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (currentStep < 4) {
      setFormData({ ...formData, ...data });
      setCurrentStep(currentStep + 1);
    } else {
      try {
        setSubmitting(true);
        const finalData = { ...formData, ...data };
        
        // Get current user session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          toast.error("Erro ao verificar autenticação");
          return;
        }
        
        if (!sessionData.session) {
          toast.error("Você precisa estar logado para cadastrar um espaço");
          navigate("/");
          return;
        }
        
        const userId = sessionData.session.user.id;
        console.log("Registering space for user:", userId);
        
        // Insert space data - avoiding any calls that might trigger user_roles policies
        const { data: spaceData, error: spaceError } = await supabase
          .from("spaces")
          .insert({
            name: finalData.name,
            phone: finalData.phone,
            state: finalData.state,
            address: finalData.address,
            zip_code: finalData.zipCode,
            number: finalData.number,
            description: finalData.description,
            price: finalData.price,
            capacity: finalData.capacity,
            parking: finalData.parking,
            wifi: finalData.wifi,
            sound_system: finalData.soundSystem,
            air_conditioning: finalData.airConditioning,
            kitchen: finalData.kitchen,
            pool: finalData.pool,
            latitude: location?.lat || null,
            longitude: location?.lng || null,
            user_id: userId,
            status: 'pending'
          })
          .select()
          .single();

        if (spaceError) {
          console.error("Error submitting space:", spaceError);
          throw spaceError;
        }

        // Upload photos if any
        if (selectedFiles.length > 0 && spaceData) {
          console.log(`Uploading ${selectedFiles.length} photos for space ${spaceData.id}`);
          
          const uploadPromises = selectedFiles.map(async (file, index) => {
            const fileExtension = file.name.split('.').pop();
            const filePath = `${userId}/${spaceData.id}/${index + 1}.${fileExtension}`;
            
            // Upload the file to storage
            const { error: uploadError } = await supabase.storage
              .from('spaces')
              .upload(filePath, file);

            if (uploadError) {
              console.error(`Error uploading file ${index + 1}:`, uploadError);
              throw uploadError;
            }

            // Insert reference in space_photos table
            const { error: photoError } = await supabase
              .from('space_photos')
              .insert({
                space_id: spaceData.id,
                storage_path: filePath
              });

            if (photoError) {
              console.error(`Error inserting photo reference ${index + 1}:`, photoError);
              throw photoError;
            }
            
            console.log(`Successfully uploaded photo ${index + 1} for space ${spaceData.id}`);
          });

          await Promise.all(uploadPromises);
        }

        toast.success("Espaço cadastrado com sucesso! Aguardando aprovação.");
        navigate("/profile");
      } catch (error: any) {
        console.error("Error submitting space:", error);
        toast.error(`Erro ao cadastrar espaço: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleLocationSelected = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className="container px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={goBack} className="mr-2 p-0 h-auto">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">Cadastrar Espaço</h1>
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step} 
              className={`flex items-center ${
                step < currentStep 
                  ? "text-iparty" 
                  : step === currentStep 
                    ? "text-black font-medium" 
                    : "text-gray-400"
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  step < currentStep 
                    ? "bg-iparty text-white" 
                    : step === currentStep 
                      ? "border-2 border-iparty" 
                      : "border-2 border-gray-300"
                }`}
              >
                {step < currentStep ? <Check size={16} /> : step}
              </div>
              <span className="hidden md:inline">
                {step === 1 ? "Informações Básicas" : 
                 step === 2 ? "Comodidades" : 
                 step === 3 ? "Localização" : "Fotos"}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-iparty rounded-full transition-all" 
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }} 
          />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 1 && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Espaço</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input placeholder="Nome do espaço" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input placeholder="(00) 00000-0000" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input placeholder="Estado" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input placeholder="00000-000" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input placeholder="Endereço" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Nº" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Info className="absolute left-3 top-3 text-muted-foreground" size={18} />
                        <Textarea 
                          placeholder="Descreva o espaço..." 
                          className="pl-10 min-h-[120px]" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input placeholder="R$ 0,00" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input placeholder="Nº de pessoas" className="pl-10" type="number" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <List size={24} className="text-iparty mr-3" />
                <h2 className="text-xl font-medium">Comodidades</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Estacionamento</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wifi"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Internet / Wi-Fi</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="soundSystem"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Sistema de som</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="airConditioning"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Ar condicionado</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kitchen"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Cozinha</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pool"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Piscina</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <MapPin size={24} className="text-iparty mr-3" />
                <h2 className="text-xl font-medium">Localização no Mapa</h2>
              </div>
              
              <div className="bg-gray-200 rounded-xl h-[400px] flex items-center justify-center">
                <LocationMap 
                  onLocationSelected={handleLocationSelected}
                  initialLocation={location}
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Arraste o mapa e coloque o marcador na localização exata do seu espaço para facilitar a localização pelos clientes.
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <Image size={24} className="text-iparty mr-3" />
                <h2 className="text-xl font-medium">Fotos do Espaço</h2>
              </div>
              
              <div className="border rounded-lg p-6">
                <ImageUpload 
                  onImagesChange={handleFilesChange} 
                  maxImages={5}
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Adicione fotos de boa qualidade do seu espaço para aumentar as chances de aprovação.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-iparty"
              disabled={submitting}
            >
              {currentStep < 4 ? (
                <>
                  Próximo
                  <ChevronRight size={16} />
                </>
              ) : submitting ? (
                "Enviando..."
              ) : (
                "Finalizar"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RegisterSpace;
