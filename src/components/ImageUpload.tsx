
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
  previewUrls?: string[];
  onRemovePreview?: (index: number) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesChange,
  maxImages = 20,
  previewUrls = [],
  onRemovePreview,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    
    const files = Array.from(event.target.files);
    const totalFiles = selectedFiles.length + previewUrls.length + files.length;
    
    if (totalFiles > maxImages) {
      toast.error(`Você pode fazer upload de no máximo ${maxImages} imagens`);
      return;
    }
    
    const newSelectedFiles = [...selectedFiles, ...files];
    setSelectedFiles(newSelectedFiles);
    
    // Create object URLs for previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
    
    // Notify parent component
    onImagesChange(newSelectedFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previews];
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    
    // Notify parent component
    onImagesChange(newFiles);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-4 mb-4">
        {previewUrls.map((url, index) => (
          <div key={`existing-${index}`} className="relative w-24 h-24">
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover rounded-md"
            />
            {onRemovePreview && (
              <button
                type="button"
                onClick={() => onRemovePreview(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        
        {previews.map((preview, index) => (
          <div key={`new-${index}`} className="relative w-24 h-24">
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover rounded-md"
            />
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        
        {(selectedFiles.length + previewUrls.length) < maxImages && (
          <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
              <Upload size={24} className="text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Upload</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Adicione até {maxImages} fotos do seu espaço. Clique em "Upload" para adicionar.
      </p>
    </div>
  );
};

export default ImageUpload;
