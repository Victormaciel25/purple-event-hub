
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";

type SpaceData = {
  name: string;
  address: string;
  number: string;
  state: string;
  zip_code: string;
  description: string;
  price: string;
  capacity: string;
  phone: string;
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
};

const EditSpace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<SpaceData>({
    name: "",
    address: "",
    number: "",
    state: "",
    zip_code: "",
    description: "",
    price: "",
    capacity: "",
    phone: "",
    parking: false,
    wifi: false,
    sound_system: false,
    air_conditioning: false,
    kitchen: false,
    pool: false
  });
  
  useEffect(() => {
    if (id) {
      fetchSpaceDetails(id);
    }
  }, [id]);
  
  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      setLoading(true);
      
      // Verificar se o usuário está autenticado
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error("Você precisa estar logado para editar um espaço");
        navigate("/");
        return;
      }
      
      // Buscar dados do espaço
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("*")
        .eq("id", spaceId)
        .single();
      
      if (spaceError) throw spaceError;
      
      // Verificar se o espaço pertence ao usuário atual
      if (spaceData.user_id !== sessionData.session.user.id) {
        toast.error("Você não tem permissão para editar este espaço");
        navigate("/user-spaces");
        return;
      }
      
      // Preencher o formulário com os dados do espaço
      setFormData({
        name: spaceData.name || "",
        address: spaceData.address || "",
        number: spaceData.number || "",
        state: spaceData.state || "",
        zip_code: spaceData.zip_code || "",
        description: spaceData.description || "",
        price: spaceData.price || "",
        capacity: spaceData.capacity || "",
        phone: spaceData.phone || "",
        parking: spaceData.parking || false,
        wifi: spaceData.wifi || false,
        sound_system: spaceData.sound_system || false,
        air_conditioning: spaceData.air_conditioning || false,
        kitchen: spaceData.kitchen || false,
        pool: spaceData.pool || false
      });
      
      // Buscar fotos do espaço
      const { data: photoData, error: photoError } = await supabase
        .from("space_photos")
        .select("id, storage_path")
        .eq("space_id", spaceId);
      
      if (photoError) throw photoError;
      
      // Obter URLs assinadas para as fotos existentes
      const photoUrls = await Promise.all((photoData || []).map(async (photo) => {
        const { data: urlData } = await supabase.storage
          .from('spaces')
          .createSignedUrl(photo.storage_path, 3600);
          
        return {
          id: photo.id,
          url: urlData?.signedUrl || "",
          path: photo.storage_path
        };
      }));
      
      setExistingPhotos(photoUrls);
    } catch (error) {
      console.error("Erro ao carregar detalhes do espaço:", error);
      toast.error("Erro ao carregar detalhes do espaço");
      navigate("/user-spaces");
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleNewPhotosChange = (files: File[]) => {
    setNewPhotos(files);
  };
  
  const handleExistingPhotoDelete = (photoId: string) => {
    // Marcar foto para exclusão
    setPhotosToDelete(prev => [...prev, photoId]);
    // Remover da lista de exibição
    setExistingPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Verificar se o usuário está autenticado
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session || !id) {
        toast.error("Erro ao atualizar espaço");
        return;
      }
      
      // Atualizar o espaço e definir status como 'pending' novamente
      const { error: updateError } = await supabase
        .from("spaces")
        .update({
          ...formData,
          status: 'pending', // Enviar para aprovação novamente
          rejection_reason: null // Limpar qualquer motivo de rejeição anterior
        })
        .eq("id", id);
      
      if (updateError) throw updateError;
      
      // Excluir fotos marcadas para exclusão
      for (const photoId of photosToDelete) {
        // Buscar caminho de armazenamento da foto antes de excluí-la
        const { data: photoData } = await supabase
          .from("space_photos")
          .select("storage_path")
          .eq("id", photoId)
          .single();
          
        if (photoData?.storage_path) {
          // Excluir arquivo do storage
          await supabase.storage
            .from('spaces')
            .remove([photoData.storage_path]);
        }
        
        // Excluir registro da foto no banco de dados
        await supabase
          .from("space_photos")
          .delete()
          .eq("id", photoId);
      }
      
      // Fazer upload das novas fotos
      for (const file of newPhotos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}.${fileExt}`;
        const filePath = `space_photos/${fileName}`;
        
        // Upload da foto para o storage
        const { error: uploadError } = await supabase.storage
          .from('spaces')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        // Registrar a foto no banco de dados
        const { error: insertError } = await supabase
          .from("space_photos")
          .insert({
            space_id: id,
            storage_path: filePath
          });
          
        if (insertError) throw insertError;
      }
      
      toast.success("Espaço atualizado e enviado para aprovação");
      navigate("/user-spaces");
    } catch (error) {
      console.error("Erro ao atualizar espaço:", error);
      toast.error("Erro ao atualizar espaço");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container px-4 py-6 flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <p className="mt-4 text-muted-foreground">Carregando detalhes do espaço...</p>
      </div>
    );
  }
  
  return (
    <div className="container px-4 py-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/user-spaces")} className="mr-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Editar Espaço</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Espaço</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  rows={4}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input 
                  id="price" 
                  name="price" 
                  type="number"
                  min="0"
                  step="0.01" 
                  value={formData.price} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacidade (pessoas)</Label>
                <Input 
                  id="capacity" 
                  name="capacity" 
                  type="number"
                  min="1"
                  value={formData.capacity} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone de Contato</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  required 
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Endereço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input 
                  id="number" 
                  name="number" 
                  value={formData.number} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input 
                  id="state" 
                  name="state" 
                  value={formData.state} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="zip_code">CEP</Label>
                <Input 
                  id="zip_code" 
                  name="zip_code" 
                  value={formData.zip_code} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Comodidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="parking" 
                  checked={formData.parking} 
                  onCheckedChange={(checked) => handleCheckboxChange("parking", !!checked)} 
                />
                <label 
                  htmlFor="parking"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Estacionamento
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="wifi" 
                  checked={formData.wifi} 
                  onCheckedChange={(checked) => handleCheckboxChange("wifi", !!checked)} 
                />
                <label 
                  htmlFor="wifi"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Wi-Fi
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sound_system" 
                  checked={formData.sound_system} 
                  onCheckedChange={(checked) => handleCheckboxChange("sound_system", !!checked)} 
                />
                <label 
                  htmlFor="sound_system"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Sistema de Som
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="air_conditioning" 
                  checked={formData.air_conditioning} 
                  onCheckedChange={(checked) => handleCheckboxChange("air_conditioning", !!checked)} 
                />
                <label 
                  htmlFor="air_conditioning"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Ar Condicionado
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="kitchen" 
                  checked={formData.kitchen} 
                  onCheckedChange={(checked) => handleCheckboxChange("kitchen", !!checked)} 
                />
                <label 
                  htmlFor="kitchen"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Cozinha
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="pool" 
                  checked={formData.pool} 
                  onCheckedChange={(checked) => handleCheckboxChange("pool", !!checked)} 
                />
                <label 
                  htmlFor="pool"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Piscina
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Exibir fotos existentes */}
            {existingPhotos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Fotos Atuais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative h-32 bg-gray-100 rounded-md overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt="Foto do espaço" 
                        className="w-full h-full object-cover"
                      />
                      <Button 
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        type="button"
                        onClick={() => handleExistingPhotoDelete(photo.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upload de novas fotos */}
            <div>
              <h3 className="text-sm font-medium mb-2">Adicionar Novas Fotos</h3>
              <ImageUpload 
                onImagesChange={handleNewPhotosChange}
                maxFiles={5}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate("/user-spaces")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-iparty"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              "Atualizar e Enviar para Aprovação"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditSpace;
