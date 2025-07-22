
import { useState, useCallback } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { detectPlatform } from '@/utils/platformDetection';

export const useCapacitorImageFile = () => {
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const platform = detectPlatform();

  const saveFileToTemp = useCallback(async (file: File): Promise<string | null> => {
    if (!platform.isCapacitor) {
      console.log('📱 CAPACITOR_FILE: Não é Capacitor, retornando null');
      return null;
    }

    try {
      console.log('💾 CAPACITOR_FILE: Salvando arquivo temporário:', file.name);
      
      // Converter File para base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remover o prefixo "data:image/...;base64,"
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Criar nome único para o arquivo
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `temp_preview_${Date.now()}.${fileExtension}`;

      // Salvar no diretório temporário
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      console.log('✅ CAPACITOR_FILE: Arquivo salvo:', result.uri);
      
      // Adicionar à lista de arquivos temporários
      setTempFiles(prev => [...prev, fileName]);
      
      return result.uri;
    } catch (error) {
      console.error('❌ CAPACITOR_FILE: Erro ao salvar arquivo:', error);
      return null;
    }
  }, [platform.isCapacitor]);

  const cleanupTempFiles = useCallback(async () => {
    if (!platform.isCapacitor || tempFiles.length === 0) return;

    console.log('🧹 CAPACITOR_FILE: Limpando arquivos temporários:', tempFiles.length);
    
    for (const fileName of tempFiles) {
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Cache,
        });
      } catch (error) {
        console.warn('⚠️ CAPACITOR_FILE: Erro ao deletar arquivo:', fileName, error);
      }
    }
    
    setTempFiles([]);
  }, [tempFiles, platform.isCapacitor]);

  return {
    saveFileToTemp,
    cleanupTempFiles,
    tempFileCount: tempFiles.length
  };
};
