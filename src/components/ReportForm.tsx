
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  reportedItemName: string;
  reportedItemUrl: string;
  reportType: "space" | "vendor";
}

const ReportForm: React.FC<ReportFormProps> = ({
  isOpen,
  onClose,
  reportedItemName,
  reportedItemUrl,
  reportType,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setImages(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.description) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to Supabase storage if any
      const imageUrls: string[] = [];
      
      if (images.length > 0) {
        for (const image of images) {
          const fileName = `report-${Date.now()}-${image.name}`;
          const { data, error } = await supabase.storage
            .from("reports")
            .upload(fileName, image);

          if (error) {
            console.error("Error uploading image:", error);
          } else {
            const { data: publicUrl } = supabase.storage
              .from("reports")
              .getPublicUrl(fileName);
            imageUrls.push(publicUrl.publicUrl);
          }
        }
      }

      // Send report via edge function
      const { error } = await supabase.functions.invoke("send-report", {
        body: {
          reporterName: formData.name,
          reporterEmail: formData.email,
          reporterPhone: formData.phone,
          reportedItemName,
          reportedItemUrl,
          reportType: reportType === "space" ? "Espaço" : "Fornecedor",
          description: formData.description,
          imageUrls,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Denúncia enviada com sucesso!");
      onClose();
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        description: "",
      });
      setImages([]);
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Erro ao enviar denúncia. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Denunciar {reportType === "space" ? "Espaço" : "Fornecedor"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <Label>Item denunciado</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">{reportedItemName}</p>
              <p className="text-sm text-gray-600">{reportedItemUrl}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Imagens (opcional)</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {images.length > 0 && (
              <p className="text-sm text-gray-600">
                {images.length} imagem(ns) selecionada(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição da denúncia *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva detalhadamente o motivo da denúncia..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Denúncia"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportForm;
