
import React, { useState } from "react";
import { X, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SingleImageUploadProps {
  onImageChange: (urls: string[]) => void;
  uploadPath: string;
  aspectRatio?: string;
  maxSize?: number;
  initialImages: string[];
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
  maxImages?: number;
}

const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  onImageChange,
  uploadPath,
  aspectRatio = "1:1",
  maxSize = 5,
  initialImages = [],
  isUploading,
  setIsUploading,
  className = "w-full",
  maxImages = 5,
}) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>(initialImages);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    if (previewUrls.length + files.length > maxImages) {
      toast.error(`Você pode enviar no máximo ${maxImages} imagens`);
      return;
    }
    
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      // Process each file
      for (const file of files) {
        const fileSizeInMB = file.size / (1024 * 1024);
        
        if (fileSizeInMB > maxSize) {
          toast.error(`O arquivo ${file.name} é muito grande. Tamanho máximo: ${maxSize}MB`);
          continue;
        }
        
        // Create a local preview
        const objectUrl = URL.createObjectURL(file);
        
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from(uploadPath)
          .upload(filePath, file);
        
        if (error) {
          console.error("Error uploading image:", error);
          toast.error(`Erro ao enviar imagem ${file.name}.`);
          URL.revokeObjectURL(objectUrl);
          continue;
        }
        
        // Get the public URL
        const { data: publicURLData } = supabase.storage
          .from(uploadPath)
          .getPublicUrl(filePath);
        
        newUrls.push(publicURLData.publicUrl);
      }
      
      if (newUrls.length > 0) {
        const allUrls = [...previewUrls, ...newUrls];
        setPreviewUrls(allUrls);
        onImageChange(allUrls);
        toast.success(`${newUrls.length} ${newUrls.length === 1 ? 'imagem enviada' : 'imagens enviadas'} com sucesso!`);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Erro ao enviar as imagens. Tente novamente.");
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newPreviewUrls = [...previewUrls];
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
    onImageChange(newPreviewUrls);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
        {previewUrls.map((url, index) => (
          <div 
            key={`image-${index}`} 
            className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden"
          >
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        {previewUrls.length < maxImages && (
          <label className="cursor-pointer aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
            <Images size={36} className="text-gray-300 mb-2" />
            <span className="text-sm text-gray-500 text-center px-2">
              {isUploading ? "Enviando..." : "Adicionar imagens"}
            </span>
            <span className="text-xs text-gray-400 mt-1 text-center px-2">
              ({aspectRatio}, max {maxSize}MB)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
              multiple
            />
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {previewUrls.length} de {maxImages} imagens
      </p>
    </div>
  );
};

export default SingleImageUpload;
