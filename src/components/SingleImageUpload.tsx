
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

  // Função para criar preview local mais robusta
  const createLocalPreview = (file: File): string => {
    try {
      console.log("🖼️ UPLOAD: Criando preview para arquivo:", file.name);
      
      if (isAndroidCapacitor()) {
        // Para Android, usar FileReader como fallback
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            console.log("📱 UPLOAD: Preview criado via FileReader");
            resolve(result);
          };
          reader.onerror = () => {
            console.warn("📱 UPLOAD: Erro no FileReader, usando URL.createObjectURL");
            try {
              const url = URL.createObjectURL(file);
              resolve(url);
            } catch (urlError) {
              console.error("📱 UPLOAD: Erro ao criar URL:", urlError);
              resolve("");
            }
          };
          reader.readAsDataURL(file);
        }) as any; // Cast para string temporariamente
      } else {
        return URL.createObjectURL(file);
      }
    } catch (error) {
      console.error("❌ UPLOAD: Erro ao criar preview:", error);
      return "";
    }
  };

  // Cleanup melhorado para previews locais
  const cleanupLocalPreviews = (previews: LocalPreview[]) => {
    previews.forEach(preview => {
      if (preview.previewUrl && preview.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(preview.previewUrl);
          console.log("🧹 UPLOAD: Preview limpo:", preview.id);
        } catch (error) {
          console.warn("⚠️ UPLOAD: Erro ao limpar preview:", error);
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
      
      console.log(`📦 UPLOAD: Comprimindo ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
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
    console.log("🚀 UPLOAD: Iniciando processamento de arquivos...");
    
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
    
    // Criar previews locais imediatamente
    const newLocalPreviews: LocalPreview[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewId = `preview-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        let previewUrl = "";
        
        if (isAndroidCapacitor()) {
          // Para Android, usar FileReader
          previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || "");
            reader.onerror = () => {
              console.warn("📱 Fallback para URL.createObjectURL");
              try {
                resolve(URL.createObjectURL(file));
              } catch {
                resolve("");
              }
            };
            reader.readAsDataURL(file);
          });
        } else {
          previewUrl = URL.createObjectURL(file);
        }
        
        newLocalPreviews.push({
          file,
          previewUrl,
          uploading: false,
          id: previewId
        });
        
        console.log("✅ UPLOAD: Preview criado para", file.name);
      } catch (error) {
        console.error("❌ UPLOAD: Erro ao criar preview para", file.name, error);
      }
    }
    
    setLocalPreviews(prev => [...prev, ...newLocalPreviews]);
    toast.success(`${files.length} imagem(ns) selecionada(s). Iniciando upload...`);
    
    // Iniciar uploads
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewId = newLocalPreviews[i]?.id;
        
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
        if (fileSizeInMB > 1.9) {
          toast.info(`Comprimindo: ${file.name}`);
          fileToUpload = await compressImage(file);
        }
        
        const finalSizeInMB = fileToUpload.size / (1024 * 1024);
        if (finalSizeInMB > maxSize) {
          toast.error(`${file.name} muito grande (max: ${maxSize}MB)`);
          continue;
        }
        
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${uploadPath}/${fileName}`;
        
        console.log(`📤 UPLOAD: Enviando para ${filePath}`);
        
        const { data, error } = await supabase.storage
          .from('spaces')
          .upload(filePath, fileToUpload);
        
        if (error) {
          console.error("❌ UPLOAD: Erro:", error);
          toast.error(`Erro ao enviar ${fileToUpload.name}`);
          continue;
        }
        
        // Obter URL pública com cache busting
        const { data: publicURLData } = supabase.storage
          .from('spaces')
          .getPublicUrl(filePath);
        
        const finalUrl = isAndroidCapacitor() 
          ? `${publicURLData.publicUrl}?t=${Date.now()}`
          : publicURLData.publicUrl;
        
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
      cleanupLocalPreviews(localPreviews);
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
    const previewToRemove = localPreviews[index];
    if (previewToRemove && previewToRemove.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewToRemove.previewUrl);
      } catch (error) {
        console.warn("⚠️ UPLOAD: Erro ao limpar URL:", error);
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
            {uploadedUrls.map((url, index) => {
              const uniqueKey = `uploaded-${index}-${url.length}-${Date.now()}`;
              const imageUrl = isAndroidCapacitor() 
                ? `${url}${url.includes('?') ? '&' : '?'}display=${Date.now()}`
                : url;
              
              return (
                <div 
                  key={uniqueKey}
                  className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden"
                >
                  <img
                    src={imageUrl}
                    alt={`Enviada ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="sync"
                    style={{
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                      WebkitTransform: 'translate3d(0,0,0)',
                      transform: 'translate3d(0,0,0)',
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
              );
            })}
            
            {/* Previews locais */}
            {localPreviews.map((preview, index) => (
              <div 
                key={preview.id}
                className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden"
              >
                {preview.previewUrl ? (
                  <img
                    src={preview.previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                      WebkitTransform: 'translate3d(0,0,0)',
                      transform: 'translate3d(0,0,0)',
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
