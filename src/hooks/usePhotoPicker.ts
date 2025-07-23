
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useState } from 'react';

export function usePhotoPicker() {
  const [preview, setPreview] = useState<string>();

  const pick = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 800,
        height: 800,
      });
      
      // No Android/iOS, webPath já é um URL que funciona dentro do WebView:
      setPreview(photo.webPath);
      
      return photo;
    } catch (error) {
      console.error('Erro ao selecionar foto:', error);
      return null;
    }
  };

  const clearPreview = () => {
    setPreview(undefined);
  };

  return { preview, pick, clearPreview };
}
