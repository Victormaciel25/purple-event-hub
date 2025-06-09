
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import AddressAutoComplete from "@/components/AddressAutoComplete";

const EditVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    contact_number: "",
    description: "",
    address: "",
    working_hours: "",
    available_days: [] as string[],
    images: [] as string[]
  });

  const categories = [
    "Buffet", "Decoração", "DJ/Som", "Fotografia", "Cerimonial",
    "Flores", "Doces", "Bebidas", "Segurança", "Limpeza", "Outro"
  ];

  const weekDays = [
    "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
    "Sexta-feira", "Sábado", "Domingo"
  ];

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.session.user.id)
        .single();

      if (error) {
        console.error("Error fetching vendor:", error);
        toast.error("Erro ao carregar fornecedor");
        navigate("/user-vendors");
        return;
      }

      setVendor(data);
      setFormData({
        name: data.name || "",
        category: data.category || "",
        contact_number: data.contact_number || "",
        description: data.description || "",
        address: data.address || "",
        working_hours: data.working_hours || "",
        available_days: data.available_days || [],
        images: data.images || []
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao carregar fornecedor");
      navigate("/user-vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      available_days: checked 
        ? [...prev.available_days, day]
        : prev.available_days.filter(d => d !== day)
    }));
  };

  const handleAddressChange = (location: any) => {
    setFormData(prev => ({
      ...prev,
      address: location.locationName
    }));
  };

  const handleImagesChange = (files: File[]) => {
    // Convert File objects to URLs for display (this would need proper upload handling)
    const urls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...urls]
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || !formData.contact_number || !formData.description || !formData.address) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
        return;
      }

      const { error } = await supabase
        .from("vendors")
        .update({
          ...formData,
          status: 'pending', // Volta para aprovação após edição
          rejection_reason: null // Limpa motivo de rejeição anterior
        })
        .eq("id", id)
        .eq("user_id", session.session.user.id);

      if (error) {
        console.error("Error updating vendor:", error);
        toast.error("Erro ao atualizar fornecedor");
        return;
      }

      toast.success("Fornecedor atualizado com sucesso! Aguarde nova aprovação.");
      navigate("/user-vendors");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao atualizar fornecedor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Carregando fornecedor...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/user-vendors")}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold">Editar Fornecedor</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Fornecedor *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Digite o nome do fornecedor"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact_number">Telefone de Contato *</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => handleInputChange("contact_number", e.target.value)}
                placeholder="Digite o telefone de contato"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Descreva os serviços oferecidos"
                rows={4}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="address">Endereço *</Label>
              <AddressAutoComplete
                initialValue={formData.address}
                onLocationSelected={handleAddressChange}
                placeholder="Digite o endereço completo"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários e Disponibilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="working_hours">Horário de Funcionamento</Label>
              <Input
                id="working_hours"
                value={formData.working_hours}
                onChange={(e) => handleInputChange("working_hours", e.target.value)}
                placeholder="Ex: 08:00 às 18:00"
              />
            </div>

            <div>
              <Label>Dias Disponíveis</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {weekDays.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.available_days.includes(day)}
                      onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
                    />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imagens</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              previewUrls={formData.images}
              onImagesChange={handleImagesChange}
              onRemovePreview={handleRemoveImage}
              maxImages={5}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/user-vendors")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-iparty hover:bg-iparty/90"
          >
            <Save size={16} className="mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditVendor;
