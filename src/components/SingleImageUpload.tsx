
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
      
      console.log(`✅ UPLOAD: Compressão concluída (${(resultFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      return resultFile;
    } catch (error) {
      console.error("❌ UPLOAD: Erro na compressão:", error);
      toast.error(`Erro ao comprimir ${file.name}`);
      return file;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🚀 UPLOAD: Iniciando processamento de arquivos");
    
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const files = Array.from(event.target.files);
    console.log("📁 UPLOAD: Arquivos selecionados:", files.length);
    
    const totalImages = uploadedUrls.length + localPreviews.length + files.length;
    if (totalImages > maxImages) {
      toast.error(`Máximo ${maxImages} imagens permitidas`);
      return;
    }
    
    // Criar previews locais imediatamente
    const timestamp = Date.now();
    const newLocalPreviews: LocalPreview[] = files.map((file, index) => ({
      id: `local-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      uploading: false,
    }));
    
    console.log("🖼️ UPLOAD: Criando previews locais:", newLocalPreviews.length);
    setLocalPreviews(prev => [...prev, ...newLocalPreviews]);
    
    // Feedback imediato
    toast.success(`${files.length} imagem(ns) selecionada(s)`);
    
    // Iniciar uploads em background
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewId = newLocalPreviews[i]?.id;
        
        console.log(`📤 UPLOAD: Processando ${i + 1}/${files.length}: ${file.name}`);
        
        // Marcar como uploading
        if (previewId) {
          setLocalPreviews(prev => 
            prev.map(preview => 
              preview.id === previewId ? { ...preview, uploading: true } : preview
            )
          );
        }
        
        // Comprimir se necessário
        let fileToUpload = file;
        const fileSizeInMB = file.size / (1024 * 1024);
        
        if (fileSizeInMB > 1.0) {
          toast.info(`Comprimindo: ${file.name}`);
          fileToUpload = await compressImage(file);
        }
        
        const finalSizeInMB = fileToUpload.size / (1024 * 1024);
        if (finalSizeInMB > maxSize) {
          toast.error(`${file.name} muito grande (max: ${maxSize}MB)`);
          continue;
        }
        
        // Upload para Supabase
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        console.log(`📤 UPLOAD: Enviando para ${filePath}`);
        
        const { data, error } = await supabase.storage
          .from('spaces')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error("❌ UPLOAD: Erro no upload:", error);
          toast.error(`Erro ao enviar ${fileToUpload.name}`);
          continue;
        }
        
        const { data: publicURLData } = supabase.storage
          .from('spaces')
          .getPublicUrl(filePath);
        
        const finalUrl = publicURLData.publicUrl;
        
        console.log("✅ UPLOAD: URL criada:", finalUrl);
        newUrls.push(finalUrl);
      }
      
      if (newUrls.length > 0) {
        const allUploadedUrls = [...uploadedUrls, ...newUrls];
        setUploadedUrls(allUploadedUrls);
        onImageChange(allUploadedUrls);
        toast.success(`${newUrls.length} imagem(ns) enviada(s)!`);
      }
      
      // Limpar previews locais
      setLocalPreviews([]);
      
    } catch (error) {
      console.error("💥 UPLOAD: Erro geral:", error);
      toast.error("Erro no upload. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeUploadedImage = (index: number) => {
    const newUploadedUrls = [...uploadedUrls];
    newUploadedUrls.splice(index, 1);
    setUploadedUrls(newUploadedUrls);
    onImageChange(newUploadedUrls);
  };

  const removeLocalPreview = (index: number) => {
    const newLocalPreviews = [...localPreviews];
    newLocalPreviews.splice(index, 1);
    setLocalPreviews(newLocalPreviews);
  };

  const totalImages = uploadedUrls.length + localPreviews.length;

  return (
    <div className={className}>
      {totalImages > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            {/* Imagens já enviadas */}
            {uploadedUrls.map((url, index) => (
              <ImagePreview
                key={`uploaded-${index}-${url.split('?')[0]}`}
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
            
            {/* Botão para adicionar mais */}
            {totalImages < maxImages && (
              <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-square p-4 hover:border-iparty transition-colors">
                <Images size={32} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-500 text-center mb-2">
                  {isUploading ? "Enviando..." : "Adicionar"}
                </span>
                <span className="text-xs text-gray-400 text-center">
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
            {totalImages} de {maxImages} imagens
            {localPreviews.length > 0 && (
              <span className="text-orange-600 ml-2">
                ({localPreviews.length} aguardando)
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center">
          <Images size={48} className="text-gray-300 mb-4" />
          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-600">
              {isUploading ? "Enviando imagens..." : "Adicionar imagens"}
            </p>
            <p className="text-xs text-gray-400">
              Máximo {maxImages} imagens, até {maxSize}MB cada
            </p>
            <p className="text-xs text-gray-400">
              Formatos: JPG, PNG, WebP
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
            {isUploading ? "Enviando..." : "Selecionar Imagens"}
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
