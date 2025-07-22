
import React, { useState } from "react";
import { Images, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import ImagePreview from "./ImagePreview";

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

interface LocalPreview {
  id: string;
  file: File;
  uploading: boolean;
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
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(initialImages);
  const [localPreviews, setLocalPreviews] = useState<LocalPreview[]>([]);
  const inputId = `image-upload-${Math.random().toString(36).substring(2, 15)}`;

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1200,
        useWebWorker: false,
        fileType: file.type,
        initialQuality: 0.8,
      };
      
      console.log(`📦 UPLOAD: Comprimindo ${file.name}`);
      
      const compressedFile = await imageCompression(file, options);
      
      const resultFile = new File([compressedFile], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      
      console.log(`✅ UPLOAD: Compressão concluída`);
      
      return resultFile;
    } catch (error) {
      console.error("❌ UPLOAD: Erro na compressão:", error);
      return file;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🚀 UPLOAD: Processando arquivos");
    
    if (!event.target.files?.length) return;
    
    const files = Array.from(event.target.files);
    const totalImages = uploadedUrls.length + localPreviews.length + files.length;
    
    if (totalImages > maxImages) {
      toast.error(`Máximo ${maxImages} imagens permitidas`);
      return;
    }
    
    // Criar previews locais
    const newLocalPreviews: LocalPreview[] = files.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      file,
      uploading: false,
    }));
    
    setLocalPreviews(prev => [...prev, ...newLocalPreviews]);
    toast.success(`${files.length} imagem(ns) selecionada(s)`);
    
    // Upload em background
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewId = newLocalPreviews[i]?.id;
        
        // Marcar como uploading
        if (previewId) {
          setLocalPreviews(prev => 
            prev.map(p => p.id === previewId ? { ...p, uploading: true } : p)
          );
        }
        
        // Comprimir se necessário
        let fileToUpload = file;
        if (file.size > 1024 * 1024) { // > 1MB
          fileToUpload = await compressImage(file);
        }
        
        if (fileToUpload.size > maxSize * 1024 * 1024) {
          toast.error(`${file.name} muito grande`);
          continue;
        }
        
        // Upload
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36)}.${fileExt}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('spaces')
          .upload(filePath, fileToUpload);
        
        if (error) {
          console.error("❌ UPLOAD: Erro:", error);
          continue;
        }
        
        const { data: publicURLData } = supabase.storage
          .from('spaces')
          .getPublicUrl(filePath);
        
        newUrls.push(publicURLData.publicUrl);
      }
      
      if (newUrls.length > 0) {
        const allUrls = [...uploadedUrls, ...newUrls];
        setUploadedUrls(allUrls);
        onImageChange(allUrls);
        toast.success(`${newUrls.length} imagem(ns) enviada(s)!`);
      }
      
      setLocalPreviews([]);
      
    } catch (error) {
      console.error("💥 UPLOAD: Erro:", error);
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const removeUploadedImage = (index: number) => {
    const newUrls = [...uploadedUrls];
    newUrls.splice(index, 1);
    setUploadedUrls(newUrls);
    onImageChange(newUrls);
  };

  const removeLocalPreview = (index: number) => {
    const newPreviews = [...localPreviews];
    newPreviews.splice(index, 1);
    setLocalPreviews(newPreviews);
  };

  const totalImages = uploadedUrls.length + localPreviews.length;

  return (
    <div className={className}>
      {totalImages > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Imagens enviadas */}
            {uploadedUrls.map((url, index) => (
              <ImagePreview
                key={`uploaded-${index}`}
                url={url}
                alt={`Enviada ${index + 1}`}
                onRemove={() => removeUploadedImage(index)}
                className="aspect-square"
              />
            ))}
            
            {/* Previews locais */}
            {localPreviews.map((preview, index) => (
              <ImagePreview
                key={preview.id}
                file={preview.file}
                alt={`Preview ${index + 1}`}
                onRemove={() => removeLocalPreview(index)}
                isUploading={preview.uploading}
                className="aspect-square"
              />
            ))}
            
            {/* Botão adicionar */}
            {totalImages < maxImages && (
              <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-square p-4 hover:border-iparty transition-colors">
                <Images size={32} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-500 text-center">
                  {isUploading ? "Enviando..." : "Adicionar"}
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
            {totalImages} de {maxImages} imagens
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center">
          <Images size={48} className="text-gray-300 mb-4" />
          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-600">
              {isUploading ? "Enviando..." : "Adicionar imagens"}
            </p>
            <p className="text-xs text-gray-400">
              Máximo {maxImages} imagens, até {maxSize}MB cada
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={isUploading}
          >
            <Upload size={16} className="mr-2" />
            {isUploading ? "Enviando..." : "Selecionar"}
          </Button>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
            multiple
          />
        </div>
      )}
    </div>
  );
};

export default SingleImageUpload;
