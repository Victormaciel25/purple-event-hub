import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SingleImageUpload from "@/components/SingleImageUpload";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import LocationMap from "@/components/LocationMap";
import VideoUpload from "@/components/VideoUpload";

const categories = [
  "weddings",
  "corporate",
  "birthdays",
  "graduations",
];

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  address: z.string().min(5, { message: "Insira um endereço válido" }),
  number: z.string().min(1, { message: "Insira um número válido" }),
  state: z.string().min(2, { message: "Insira um estado válido" }),
  zipCode: z.string().min(8, { message: "Insira um CEP válido" }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres" }),
  price: z.string().min(1, { message: "Insira um preço válido" }),
  capacity: z.string().min(1, { message: "Insira uma capacidade válida" }),
  phone: z.string().min(10, { message: "Insira um telefone válido" }),
  parking: z.boolean().default(false),
  wifi: z.boolean().default(false),
  soundSystem: z.boolean().default(false),
  airConditioning: z.boolean().default(false),
  kitchen: z.boolean().default(false),
  pool: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const RegisterSpace = () => {
  const navigate = useNavigate();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      number: "",
      state: "",
      zipCode: "",
      description: "",
      price: "",
      capacity: "",
      phone: "",
      parking: false,
      wifi: false,
      soundSystem: false,
      airConditioning: false,
      kitchen: false,
      pool: false,
    },
  });

  const handleImageChange = (urls: string[]) => {
    setImageUrls(urls);
  };

  const handleLocationSelected = (selectedLocation: { lat: number; lng: number; locationName: string }) => {
    setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    form.setValue('address', selectedLocation.locationName);
    console.log('Localização selecionada para o espaço:', selectedLocation);
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

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleVideoChange = (url: string | null) => {
    setVideoUrl(url);
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
        toast.error("Você precisa estar logado para cadastrar um espaço");
        navigate("/login");
        return;
      }

      const userId = session.session.user.id;
      
      const { error } = await supabase
        .from('spaces')
        .insert({
          name: values.name,
          address: values.address,
          number: values.number,
          state: values.state,
          zip_code: values.zipCode,
          description: values.description,
          price: values.price,
          capacity: values.capacity,
          phone: values.phone,
          parking: values.parking,
          wifi: values.wifi,
          sound_system: values.soundSystem,
          air_conditioning: values.airConditioning,
          kitchen: values.kitchen,
          pool: values.pool,
          categories: selectedCategories,
          images: imageUrls,
          video_url: videoUrl,
          user_id: userId,
          status: 'pending',
          latitude: mapLocation.lat,
          longitude: mapLocation.lng,
        });
        
      if (error) {
        console.error("Error submitting space:", error);
        toast.error("Erro ao cadastrar espaço. Tente novamente.");
        return;
      }
      
      toast.success("Espaço cadastrado com sucesso!");
      navigate("/user-spaces");
    } catch (error) {
      console.error("Error submitting space:", error);
      toast.error("Erro ao cadastrar espaço. Tente novamente.");
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

      <h1 className="text-2xl font-bold mb-6">Cadastrar Espaço</h1>

      <div className="mb-6">
        <p className="text-muted-foreground text-sm mb-2">Imagens do espaço</p>
        <div className="w-full">
          <SingleImageUpload
            onImageChange={handleImageChange}
            uploadPath="spaces"
            aspectRatio="16:9"
            maxSize={2}
            initialImages={imageUrls}
            isUploading={uploading}
            setIsUploading={setUploading}
            className="w-full"
            maxImages={10}
          />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-muted-foreground text-sm mb-2">Vídeo promocional (opcional)</p>
        <VideoUpload
          onVideoChange={handleVideoChange}
          uploadPath="spaces/videos"
          maxSize={50}
          maxDuration={10}
          initialVideo={videoUrl}
          isUploading={videoUploading}
          setIsUploading={setVideoUploading}
          className="w-full"
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Espaço</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Espaço de Eventos ABC" {...field} />
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

          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: São Paulo" {...field} />
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
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Selecionar Localização no Mapa</FormLabel>
            <p className="text-sm text-muted-foreground">
              {mapCenter 
                ? "Clique no mapa para marcar a localização exata do seu espaço"
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Conte um pouco sobre o espaço e os serviços oferecidos" 
                    className="min-h-[120px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço por evento</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 1500" 
                    type="number" 
                    {...field} 
                  />
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
                <FormLabel>Capacidade máxima de pessoas</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 200" 
                    type="number" 
                    {...field} 
                  />
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
                <FormLabel>Telefone de contato</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-8888" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Estacionamento</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de estacionamento no local
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="wifi"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Wi-Fi</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de rede Wi-Fi para os convidados
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="soundSystem"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Sistema de Som</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de sistema de som para eventos
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="airConditioning"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Ar Condicionado</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de ar condicionado no espaço
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="kitchen"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Cozinha</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de cozinha equipada
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pool"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Piscina</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Disponibilidade de piscina para uso
                  </p>
                </div>
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Categorias de Eventos</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((category) => (
                <FormField
                  key={category}
                  control={form.control}
                  name={category}
                  render={() => (
                    <FormItem className="flex flex-row items-center space-x-2 rounded-lg border p-2">
                      <FormControl>
                        <Checkbox
                          id={category}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                      </FormControl>
                      <FormLabel htmlFor={category} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-iparty hover:bg-iparty/90" 
            disabled={submitting || uploading || videoUploading}
          >
            {submitting ? "Cadastrando..." : "Cadastrar Espaço"}
          </Button>
        </form>
      </Form>

      <div className="h-20"></div>
    </div>
  );
};

export default RegisterSpace;
