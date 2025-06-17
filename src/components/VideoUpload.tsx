
import React, { useState, useRef } from "react";
import { X, Video, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface VideoUploadProps {
  onVideoChange: (url: string | null) => void;
  uploadPath: string;
  maxSize?: number; // em MB
  maxDuration?: number; // em segundos
  initialVideo?: string;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoChange,
  uploadPath,
  maxSize = 50, // 50MB padrão
  maxDuration = 10, // 10 segundos padrão
  initialVideo,
  isUploading,
  setIsUploading,
  className = "w-full",
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > maxDuration) {
          toast.error(`O vídeo deve ter no máximo ${maxDuration} segundos. Duração atual: ${Math.round(duration)}s`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      
      video.onerror = () => {
        toast.error("Erro ao validar o vídeo");
        resolve(false);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('video/')) {
      toast.error("Por favor, selecione um arquivo de vídeo válido");
      return;
    }

    // Validar tamanho
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      toast.error(`O vídeo deve ter no máximo ${maxSize}MB. Tamanho atual: ${fileSizeInMB.toFixed(2)}MB`);
      return;
    }

    // Validar duração
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${uploadPath}/${fileName}`;

      console.log(`📤 Fazendo upload de vídeo para bucket 'spaces' com caminho: ${filePath}`);

      const { data, error } = await supabase.storage
        .from('spaces')
        .upload(filePath, file);

      if (error) {
        console.error("❌ Erro no upload:", error);
        toast.error(`Erro ao enviar vídeo: ${error.message}`);
        return;
      }

      console.log(`✅ Upload de vídeo realizado com sucesso:`, data);

      // Obter a URL pública
      const { data: publicURLData } = supabase.storage
        .from('spaces')
        .getPublicUrl(filePath);

      console.log(`🔗 URL pública do vídeo criada:`, publicURLData.publicUrl);
      
      setVideoUrl(publicURLData.publicUrl);
      onVideoChange(publicURLData.publicUrl);
      toast.success("Vídeo enviado com sucesso!");
    } catch (error) {
      console.error("💥 Erro geral no upload:", error);
      toast.error("Erro ao enviar o vídeo. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeVideo = () => {
    setVideoUrl(null);
    onVideoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {videoUrl ? (
        <div className="relative border border-gray-200 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-48 object-cover"
            preload="metadata"
          />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
            disabled={isUploading}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Video size={48} className="mx-auto text-gray-300 mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {isUploading ? "Enviando vídeo..." : "Adicionar vídeo"}
              </p>
              <p className="text-xs text-gray-400">
                Máximo {maxDuration}s, até {maxSize}MB
              </p>
              <p className="text-xs text-gray-400">
                Formatos: MP4, WebM, MOV
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={16} className="mr-2" />
              {isUploading ? "Enviando..." : "Selecionar Vídeo"}
            </Button>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default VideoUpload;
