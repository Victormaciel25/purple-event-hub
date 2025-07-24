import React, { useState } from "react";
import { X, Images, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";

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
  file: File;
  previewUrl: string;
  uploading: boolean;
  id: string;
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

  // Detectar se está no Android/Capacitor
  const isAndroidCapacitor = () => {
    return !!(window as any).Capacitor && 
           !!(window as any).Capacitor.getPlatform && 
           (window as any).Capacitor.getPlatform() === 'android';
  };

  // Cleanup function for local previews
  const cleanupLocalPreviews = (previews: LocalPreview[]) => {
    previews.forEach(preview => {
      if (preview.previewUrl && preview.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(preview.previewUrl);
        } catch (error) {
          console.warn("Erro ao limpar URL do objeto:", error);
        }
      }
    });
  };

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

  const createLocalPreview = (file: File): string => {
    try {
      if (isAndroidCapacitor()) {
        // Para Android, tentar criar URL com fallback
        const url = URL.createObjectURL(file);
        console.log("🖼️ UPLOAD: Preview URL criada para Android:", url);
        return url;
      } else {
        return URL.createObjectURL(file);
      }
    } catch (error) {
      console.error("Erro ao criar preview local:", error);
      // Fallback: retorna uma string vazia que será tratada no render
      return "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🚀 UPLOAD DEBUG: Iniciando upload de arquivos...");
    if (!event.target.files || event.target.files.length === 0) {
      console.log("❌ UPLOAD DEBUG: Nenhum arquivo selecionado");
      return;
    }
    
    const files = Array.from(event.target.files);
    console.log("📁 UPLOAD DEBUG: Arquivos selecionados:", files.length);
    
    const totalImages = uploadedUrls.length + localPreviews.length + files.length;
    if (totalImages > maxImages) {
      console.log("❌ UPLOAD DEBUG: Limite de imagens excedido");
      toast.error(`Você pode enviar no máximo ${maxImages} imagens`);
      return;
    }
    
    console.log("✅ UPLOAD DEBUG: Validações iniciais passaram, criando previews locais...");
    
    // Criar previews locais imediatamente
    const newLocalPreviews: LocalPreview[] = files.map(file => ({
      file: file,
      previewUrl: createLocalPreview(file),
      uploading: false,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    setLocalPreviews(prev => [...prev, ...newLocalPreviews]);
    
    // Toast para informar que os previews foram criados
    toast.success(`${files.length} ${files.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}. Iniciando upload...`);
    
    // Iniciar uploads
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewId = newLocalPreviews[i].id;
        
        // Marcar como uploading
        setLocalPreviews(prev => 
          prev.map(preview => 
            preview.id === previewId ? { ...preview, uploading: true } : preview
          )
        );
        
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
        const allUploadedUrls = [...uploadedUrls, ...newUrls];
        setUploadedUrls(allUploadedUrls);
        onImageChange(allUploadedUrls);
        toast.success(`${newUrls.length} ${newUrls.length === 1 ? 'imagem enviada' : 'imagens enviadas'} com sucesso!`);
      }
      
      // Limpar previews locais após upload bem-sucedido
      cleanupLocalPreviews(localPreviews);
      setLocalPreviews([]);
      
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

  const removeUploadedImage = (index: number) => {
    const newUploadedUrls = [...uploadedUrls];
    newUploadedUrls.splice(index, 1);
    setUploadedUrls(newUploadedUrls);
    onImageChange(newUploadedUrls);
  };

  const removeLocalPreview = (index: number) => {
    const previewToRemove = localPreviews[index];
    if (previewToRemove && previewToRemove.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewToRemove.previewUrl);
      } catch (error) {
        console.warn("Erro ao limpar URL do objeto:", error);
      }
    }
    
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
              <div 
                key={`uploaded-${index}-${Date.now()}`} 
                className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden"
              >
                <img
                  src={`${url}?t=${Date.now()}`}
                  alt={`Enviada ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  style={{
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeUploadedImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                  disabled={isUploading}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            
            {/* Previews locais */}
            {localPreviews.map((preview, index) => (
              <div 
                key={`local-${preview.id}`} 
                className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden"
              >
                {preview.previewUrl ? (
                  <img
                    src={preview.previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Images size={24} className="text-gray-400" />
                  </div>
                )}
                
                {/* Overlay de loading */}
                {preview.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* Botão de remover */}
                <button
                  type="button"
                  onClick={() => removeLocalPreview(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                  disabled={preview.uploading}
                >
                  <X size={16} />
                </button>
                
                {/* Indicador de status */}
                {!preview.uploading && (
                  <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    Aguardando
                  </div>
                )}
              </div>
            ))}
            
            {/* Botão para adicionar mais imagens */}
            {totalImages < maxImages && (
              <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center aspect-square p-4">
                <Images size={32} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-500 text-center mb-2">
                  {isUploading ? "Enviando..." : "Adicionar"}
                </span>
                <span className="text-xs text-gray-400 text-center mb-1">
                  ({aspectRatio}, max {maxSize}MB)
                </span>
                <span className="text-xs text-gray-400 text-center">
                  Preview instantâneo
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
                ({localPreviews.length} aguardando upload)
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
            <p className="text-xs text-gray-400">
              Preview instantâneo no dispositivo
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
