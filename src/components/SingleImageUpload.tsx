
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SingleImageUploadProps {
  onImageChange: (url: string | null) => void;
  uploadPath: string;
  aspectRatio?: string;
  maxSize?: number;
  initialImage: string | null;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}

const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  onImageChange,
  uploadPath,
  aspectRatio = "1:1",
  maxSize = 5,
  initialImage,
  isUploading,
  setIsUploading,
  className = "w-full h-48",
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileSizeInMB = file.size / (1024 * 1024);
    
    if (fileSizeInMB > maxSize) {
      toast.error(`O arquivo é muito grande. Tamanho máximo: ${maxSize}MB`);
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${uploadPath}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from(uploadPath)
        .upload(filePath, file);
      
      if (error) throw error;
      
      // Get the public URL
      const { data: publicURLData } = supabase.storage
        .from(uploadPath)
        .getPublicUrl(filePath);
      
      onImageChange(publicURLData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar a imagem. Tente novamente.");
      setPreviewUrl(initialImage);
      onImageChange(initialImage);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
  };

  return (
    <div className={`relative border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden ${className}`}>
      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
            disabled={isUploading}
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
          <Image size={48} className="text-gray-300 mb-2" />
          <span className="text-sm text-gray-500">
            {isUploading ? "Enviando..." : "Adicionar imagem"}
          </span>
          <span className="text-xs text-gray-400 mt-1">
            ({aspectRatio}, max {maxSize}MB)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
};

export default SingleImageUpload;
