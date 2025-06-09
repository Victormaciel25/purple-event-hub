
import React, { useState } from "react";
import { X, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1.9,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: file.type,
      };
      
      console.log(`Comprimindo imagem: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const compressedFile = await imageCompression(file, options);
      
      const resultFile = new File([compressedFile], file.name, {
        type: file.type,
        lastModified: new Date().getTime(),
      });
      
      console.log(`Imagem comprimida: ${file.name} (${(resultFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      return resultFile;
    } catch (error) {
      console.error("Erro ao comprimir imagem:", error);
      toast.error(`Erro ao comprimir a imagem ${file.name}`);
      return file;
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
      // Verificar se o bucket existe antes de fazer upload
      console.log("🔍 Verificando bucket 'spaces'...");
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("❌ Erro ao listar buckets:", bucketsError);
        toast.error("Erro ao acessar armazenamento");
        return;
      }
      
      const spacesBucket = buckets?.find(bucket => bucket.name === 'spaces');
      if (!spacesBucket) {
        console.error("❌ Bucket 'spaces' não encontrado!");
        toast.error("Bucket de armazenamento não encontrado");
        return;
      }
      
      console.log("✅ Bucket 'spaces' encontrado:", spacesBucket);
      
      const newUrls: string[] = [];
      
      for (const file of files) {
        const fileSizeInMB = file.size / (1024 * 1024);
        
        let fileToUpload = file;
        if (fileSizeInMB > 1.9) {
          toast.info(`Comprimindo imagem: ${file.name}`);
          fileToUpload = await compressImage(file);
        } else {
          console.log(`Imagem já está abaixo do limite: ${file.name} (${fileSizeInMB.toFixed(2)}MB)`);
        }
        
        const finalSizeInMB = fileToUpload.size / (1024 * 1024);
        if (finalSizeInMB > maxSize) {
          toast.error(`A imagem ${file.name} ainda é muito grande mesmo após compressão. Tamanho máximo: ${maxSize}MB`);
          continue;
        }
        
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        console.log(`📤 Fazendo upload para bucket 'spaces' com caminho: ${filePath}`);
        
        const { data, error } = await supabase.storage
          .from('spaces')
          .upload(filePath, fileToUpload);
        
        if (error) {
          console.error("❌ Erro no upload:", error);
          toast.error(`Erro ao enviar imagem ${fileToUpload.name}: ${error.message}`);
          continue;
        }
        
        console.log(`✅ Upload realizado com sucesso:`, data);
        
        // Obter a URL pública
        const { data: publicURLData } = supabase.storage
          .from('spaces')
          .getPublicUrl(filePath);
        
        console.log(`🔗 URL pública criada:`, publicURLData.publicUrl);
        newUrls.push(publicURLData.publicUrl);
      }
      
      if (newUrls.length > 0) {
        const allUrls = [...previewUrls, ...newUrls];
        setPreviewUrls(allUrls);
        onImageChange(allUrls);
        toast.success(`${newUrls.length} ${newUrls.length === 1 ? 'imagem enviada' : 'imagens enviadas'} com sucesso!`);
      }
    } catch (error) {
      console.error("💥 Erro geral no upload:", error);
      toast.error("Erro ao enviar as imagens. Tente novamente.");
    } finally {
      setIsUploading(false);
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4 w-full">
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
          <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-square p-4">
            <Images size={32} className="text-gray-300 mb-2" />
            <span className="text-sm text-gray-500 text-center mb-2">
              {isUploading ? "Enviando..." : "Adicionar"}
            </span>
            <span className="text-xs text-gray-400 text-center mb-1">
              ({aspectRatio}, max {maxSize}MB)
            </span>
            <span className="text-xs text-gray-400 text-center">
              Compressão automática
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
