import React, { useState } from "react";
import { X, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE } from "@/config/app-config";
import imageCompression from "browser-image-compression";

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

  // Função para comprimir a imagem
  const compressImage = async (file: File): Promise<File> => {
    try {
      // Opções para compressão
      const options = {
        maxSizeMB: 1.9, // Comprime para menos de 2MB
        maxWidthOrHeight: 1280, // Limita a largura/altura
        useWebWorker: true,
        fileType: file.type,
      };
      
      // Log inicial do tamanho da imagem
      console.log(`Comprimindo imagem: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Comprimir a imagem
      const compressedFile = await imageCompression(file, options);
      
      // Criando um novo arquivo com o mesmo nome (para manter a extensão original)
      const resultFile = new File([compressedFile], file.name, {
        type: file.type,
        lastModified: new Date().getTime(),
      });
      
      // Log do resultado da compressão
      console.log(`Imagem comprimida: ${file.name} (${(resultFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      return resultFile;
    } catch (error) {
      console.error("Erro ao comprimir imagem:", error);
      toast.error(`Erro ao comprimir a imagem ${file.name}`);
      return file; // Retorna arquivo original em caso de falha na compressão
    }
  };

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
        
        // Verificar se precisamos comprimir (imagens maiores que 1.9MB)
        let fileToUpload = file;
        if (fileSizeInMB > 1.9) {
          toast.info(`Comprimindo imagem: ${file.name}`);
          fileToUpload = await compressImage(file);
        } else {
          console.log(`Imagem já está abaixo do limite: ${file.name} (${fileSizeInMB.toFixed(2)}MB)`);
        }
        
        // Verificar novamente o tamanho após a compressão
        const finalSizeInMB = fileToUpload.size / (1024 * 1024);
        if (finalSizeInMB > maxSize) {
          toast.error(`A imagem ${file.name} ainda é muito grande mesmo após compressão. Tamanho máximo: ${maxSize}MB`);
          continue;
        }
        
        // Create a local preview
        const objectUrl = URL.createObjectURL(fileToUpload);
        
        // Upload to Supabase Storage
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        // Check if bucket exists, if not we'll use the spaces bucket from config
        const bucketName = STORAGE.SPACES_BUCKET || "spaces";
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(uploadPath ? `${uploadPath}/${filePath}` : filePath, fileToUpload);
        
        if (error) {
          console.error("Error uploading image:", error);
          toast.error(`Erro ao enviar imagem ${fileToUpload.name}.`);
          URL.revokeObjectURL(objectUrl);
          continue;
        }
        
        // Get the public URL
        const { data: publicURLData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(uploadPath ? `${uploadPath}/${filePath}` : filePath);
        
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
          <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center min-h-[180px] p-6">
            <Images size={36} className="text-gray-300 mb-3" />
            <span className="text-sm text-gray-500 text-center px-2 mb-2">
              {isUploading ? "Enviando..." : "Adicionar imagens"}
            </span>
            <span className="text-xs text-gray-400 text-center px-2 mb-1">
              ({aspectRatio}, max {maxSize}MB)
            </span>
            <span className="text-xs text-gray-400 text-center px-2">
              Imagens grandes serão comprimidas automaticamente
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
