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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SingleImageUpload from "@/components/SingleImageUpload";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import LocationMap from "@/components/LocationMap";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale"; 
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const dayOptions = [
  { label: 'Segunda', value: 'monday' },
  { label: 'Terça', value: 'tuesday' },
  { label: 'Quarta', value: 'wednesday' },
  { label: 'Quinta', value: 'thursday' },
  { label: 'Sexta', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

const categoryOptions = [
  "Buffet",
  "Fotografia", 
  "Videomaker",
  "Storymaker",
  "Vestidos",
  "Maquiagem",
  "Doceria",
  "Bolo",
  "Decoração",
  "Assessoria"
];

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }).max(25, { message: "O nome deve ter no máximo 25 caracteres" }),
  category: z.string().min(1, { message: "Selecione uma categoria" }),
  contactNumber: z.string().min(8, { message: "Insira um número de telefone válido" }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres" }),
  address: z.string().min(5, { message: "Insira um endereço válido" }),
  zipCode: z.string().min(8, { message: "Insira um CEP válido" }),
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
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      contactNumber: "",
      description: "",
      address: "",
      zipCode: "",
      workingHours: "",
      availableDays: [],
    },
  });

  const handleImageChange = (urls: string[]) => {
    setImageUrls(urls);
  };

  const handleLocationSelected = (selectedLocation: { lat: number; lng: number; locationName: string }) => {
    setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    form.setValue('address', selectedLocation.locationName);
    console.log('Localização selecionada para o fornecedor:', selectedLocation);
  };

  const handleCepGeocoding = async (cep: string) => {
    // Remove caracteres não numéricos do CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length === 8) {
      try {
        console.log('Geocodificando CEP:', cleanCep);
        
        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { address: cleanCep }
        });

        if (error) {
          console.error('Erro ao geocodificar CEP:', error);
          toast.error("Erro ao buscar localização do CEP");
          return;
        }

        if (data && data.lat && data.lng) {
          const newCenter = { lat: data.lat, lng: data.lng };
          setMapCenter(newCenter);
          console.log('CEP geocodificado, centralizando mapa em:', newCenter);
          toast.success("Mapa centralizado na localização do CEP. Clique no mapa para marcar sua localização exata.");
        } else {
          toast.error("CEP não encontrado");
        }
      } catch (error) {
        console.error('Erro ao geocodificar CEP:', error);
        toast.error("Erro ao buscar localização do CEP");
      }
    }
  };

  const handleMapLocationSelected = (lat: number, lng: number) => {
    setMapLocation({ lat, lng });
    console.log('Localização selecionada no mapa:', { lat, lng });
    toast.success("Localização selecionada com sucesso!");
  };

  const toggleDay = (day: string) => {
    const updatedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(updatedDays);
    form.setValue('availableDays', updatedDays);
  };

  const onSubmit = async (values: FormValues) => {
    if (imageUrls.length === 0) {
      toast.error("Por favor, faça o upload de pelo menos uma imagem");
      return;
    }

    if (!mapLocation) {
      toast.error("Por favor, selecione uma localização no mapa");
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
      
      console.log("Enviando dados para o banco:", {
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
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
      });

      const { error } = await supabase
        .from('vendors')
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
          latitude: mapLocation.lat,
          longitude: mapLocation.lng,
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
        <div className="w-full">
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
                  <Input 
                    placeholder="Ex: Buffet Delicias" 
                    maxLength={25}
                    {...field} 
                  />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="00000-000" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      handleCepGeocoding(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Digite o CEP para centralizar o mapa na sua região
                </p>
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
                  <AddressAutoComplete
                    onLocationSelected={handleLocationSelected}
                    initialValue={field.value}
                    placeholder="Busque e selecione o endereço"
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Selecionar Localização no Mapa</FormLabel>
            <p className="text-sm text-muted-foreground">
              {mapCenter 
                ? "Clique no mapa para marcar a localização exata do seu negócio"
                : "Digite o CEP acima para centralizar o mapa, depois clique para marcar sua localização"
              }
            </p>
            <div className="h-96 w-full border rounded-lg">
              <LocationMap
                onLocationSelected={handleMapLocationSelected}
                initialLocation={mapCenter}
                viewOnly={false}
                spaces={[]}
              />
            </div>
            {mapLocation && (
              <p className="text-sm text-green-600">
                ✓ Localização selecionada: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
              </p>
            )}
          </div>

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

      <div className="h-20"></div>
    </div>
  );
};

export default RegisterVendor;
