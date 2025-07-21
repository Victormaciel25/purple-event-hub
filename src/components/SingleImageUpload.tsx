import React, { useState } from "react";
import { Images, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import ImagePreview from "./ImagePreview";
import { usePlatform } from "@/hooks/usePlatform";

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
  const { isAndroid, isMobileCapacitor } = usePlatform();
  const inputId = `image-upload-${Math.random().toString(36).substring(2, 15)}`;

  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: isMobileCapacitor ? 1.5 : 1.8, // Compressão mais agressiva no mobile
        maxWidthOrHeight: isMobileCapacitor ? 1024 : 1280,
        useWebWorker: !isMobileCapacitor, // Não usar web worker no mobile
        fileType: file.type,
        initialQuality: isMobileCapacitor ? 0.8 : 0.9,
      };
      
      console.log(`📦 UPLOAD: Comprimindo ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) - Mobile: ${isMobileCapacitor}`);
      
      const compressedFile = await imageCompression(file, options);
      
      const resultFile = new File([compressedFile], file.name, {
        type: file.type,
        lastModified: new Date().getTime(),
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
    console.log("🚀 UPLOAD: Iniciando processamento de arquivos... Mobile:", isMobileCapacitor, "Android:", isAndroid);
    
    if (!event.target.files || event.target.files.length === 0) {
      console.log("❌ UPLOAD: Nenhum arquivo selecionado");
      return;
    }
    
    const files = Array.from(event.target.files);
    console.log("📁 UPLOAD: Processando", files.length, "arquivo(s)");
    
    const totalImages = uploadedUrls.length + localPreviews.length + files.length;
    if (totalImages > maxImages) {
      toast.error(`Máximo ${maxImages} imagens permitidas`);
      return;
    }
    
    // Criar previews locais imediatamente com IDs únicos
    const timestamp = Date.now();
    const newLocalPreviews: LocalPreview[] = files.map((file, index) => ({
      id: `preview-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      uploading: false,
    }));
    
    console.log("🖼️ UPLOAD: Criando previews locais:", newLocalPreviews.map(p => p.id));
    setLocalPreviews(prev => [...prev, ...newLocalPreviews]);
    
    // Dar um tempo para o preview aparecer antes de começar o upload
    setTimeout(() => {
      toast.success(`${files.length} imagem(ns) selecionada(s). Iniciando upload...`);
    }, 200);
    
    // Iniciar uploads
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewId = newLocalPreviews[i]?.id;
        
        console.log(`📤 UPLOAD: Processando arquivo ${i + 1}/${files.length}: ${file.name}`);
        
        if (previewId) {
          // Marcar como uploading
          setLocalPreviews(prev => 
            prev.map(preview => 
              preview.id === previewId ? { ...preview, uploading: true } : preview
            )
          );
        }
        
        const fileSizeInMB = file.size / (1024 * 1024);
        
        let fileToUpload = file;
        if (fileSizeInMB > (isMobileCapacitor ? 1.2 : 1.5)) {
          toast.info(`Comprimindo: ${file.name}`);
          fileToUpload = await compressImage(file);
        }
        
        const finalSizeInMB = fileToUpload.size / (1024 * 1024);
        if (finalSizeInMB > maxSize) {
          toast.error(`${file.name} muito grande (max: ${maxSize}MB)`);
          continue;
        }
        
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
          console.error("❌ UPLOAD: Erro:", error);
          toast.error(`Erro ao enviar ${fileToUpload.name}`);
          continue;
        }
        
        // Obter URL pública
        const { data: publicURLData } = supabase.storage
          .from('spaces')
          .getPublicUrl(filePath);
        
        let finalUrl = publicURLData.publicUrl;
        
        // Em ambientes móveis, adicionar parâmetros para evitar cache
        if (isMobileCapacitor) {
          finalUrl = `${finalUrl}?t=${timestamp}&mobile=1&v=${Math.random().toString(36).substr(2, 9)}`;
        }
        
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
            
            {/* Botão para adicionar mais imagens */}
            {totalImages < maxImages && (
              <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-square p-4 hover:border-iparty transition-colors">
                <Images size={32} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-500 text-center mb-2">
                  {isUploading ? "Enviando..." : "Adicionar"}
                </span>
                <span className="text-xs text-gray-400 text-center mb-1">
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
            {isMobileCapacitor && (
              <span className="text-blue-600 ml-2">
                📱 Modo móvel
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
            {isMobileCapacitor && (
              <p className="text-xs text-blue-500">
                📱 Modo móvel detectado
              </p>
            )}
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
