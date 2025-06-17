
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DebugVideoUploadProps {
  spaceId?: string;
}

const DebugVideoUpload: React.FC<DebugVideoUploadProps> = ({ spaceId }) => {
  const checkVideoStorage = async () => {
    if (!spaceId) {
      console.log("❌ Nenhum spaceId fornecido para debug");
      return;
    }

    console.log("🔍 INICIANDO DEBUG DE VÍDEOS PARA ESPAÇO:", spaceId);
    
    try {
      // 1. Verificar dados na tabela space_photos
      const { data: spacePhotos, error: photosError } = await supabase
        .from('space_photos')
        .select('*')
        .eq('space_id', spaceId);

      console.log("📊 DEBUG - Dados na tabela space_photos:", {
        spaceId,
        count: spacePhotos?.length || 0,
        data: spacePhotos,
        error: photosError
      });

      if (spacePhotos && spacePhotos.length > 0) {
        // 2. Analisar cada entrada
        for (const photo of spacePhotos) {
          console.log(`📁 DEBUG - Análise detalhada da mídia ${photo.id}:`, {
            id: photo.id,
            space_id: photo.space_id,
            storage_path: photo.storage_path,
            created_at: photo.created_at,
            pathAnalysis: {
              isURL: photo.storage_path?.startsWith('http'),
              containsVideo: photo.storage_path?.toLowerCase().includes('video'),
              extension: photo.storage_path?.split('.').pop()?.toLowerCase(),
              fileName: photo.storage_path?.split('/').pop(),
              pathParts: photo.storage_path?.split('/'),
              // Detectar se é vídeo por extensão
              videoExtensions: ['.mp4', '.webm', '.mov', '.avi'].filter(ext => 
                photo.storage_path?.toLowerCase().includes(ext)
              )
            }
          });

          // 3. Tentar acessar o arquivo no storage
          if (photo.storage_path && !photo.storage_path.startsWith('http')) {
            console.log(`🔗 DEBUG - Tentando criar URL para: ${photo.storage_path}`);
            
            const { data: publicUrlData } = supabase.storage
              .from('spaces')
              .getPublicUrl(photo.storage_path);
            
            console.log(`🔗 DEBUG - URL criada:`, {
              originalPath: photo.storage_path,
              publicUrl: publicUrlData?.publicUrl
            });

            // Verificar se o arquivo existe
            const { data: fileData, error: fileError } = await supabase.storage
              .from('spaces')
              .list(photo.storage_path.split('/').slice(0, -1).join('/'));

            console.log(`📂 DEBUG - Listagem do diretório:`, {
              path: photo.storage_path.split('/').slice(0, -1).join('/'),
              files: fileData,
              error: fileError
            });
          }
        }
      }

      // 4. Verificar configuração do bucket spaces
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log("🗂️ DEBUG - Buckets disponíveis:", {
        buckets: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })),
        error: bucketsError
      });

      // 5. Verificar se existe bucket 'spaces'
      const spacesBucket = buckets?.find(b => b.id === 'spaces');
      if (spacesBucket) {
        console.log("✅ DEBUG - Bucket 'spaces' encontrado:", spacesBucket);
        
        // Listar arquivos no bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('spaces')
          .list('spaces', { limit: 100 });

        console.log("📂 DEBUG - Arquivos no bucket 'spaces':", {
          files: files?.map(f => ({ name: f.name, size: f.size, updated_at: f.updated_at })),
          error: filesError
        });
      } else {
        console.error("❌ DEBUG - Bucket 'spaces' NÃO encontrado!");
      }

    } catch (error) {
      console.error("💥 DEBUG - Erro durante verificação:", error);
    }
  };

  return (
    <Card className="p-4 m-4">
      <h3 className="text-lg font-semibold mb-4">🔧 Debug de Vídeos</h3>
      <p className="text-sm text-gray-600 mb-4">
        Este componente verifica como os vídeos estão sendo salvos no Supabase.
      </p>
      <Button onClick={checkVideoStorage} disabled={!spaceId}>
        🔍 Verificar Storage de Vídeos
      </Button>
      {!spaceId && (
        <p className="text-xs text-red-500 mt-2">
          Selecione um espaço primeiro para fazer o debug
        </p>
      )}
    </Card>
  );
};

export default DebugVideoUpload;
