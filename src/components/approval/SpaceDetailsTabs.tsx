
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Image, MapPin, Home, User, Phone, DollarSign, Check, X, Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SpaceWithProfile } from "@/types/approval";

interface SpaceDetailsTabsProps {
  space: SpaceWithProfile;
  photoUrls: string[];
  photosLoading: boolean;
  onRefreshPhotos?: () => void;
}

const SpaceDetailsTabs: React.FC<SpaceDetailsTabsProps> = ({ 
  space, 
  photoUrls, 
  photosLoading,
  onRefreshPhotos
}) => {
  // Função melhorada para verificar se é vídeo (deve ser IDÊNTICA ao hook)
  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.flv', '.wmv', '.ogg', '.ogv'];
    
    // Extrair nome do arquivo da URL
    const getFileName = (path: string) => {
      const parts = path.split('/');
      return parts[parts.length - 1] || path;
    };
    
    const fileName = getFileName(url).toLowerCase();
    const urlLower = url.toLowerCase();
    
    // Verificar extensões de vídeo no nome do arquivo
    const hasVideoExtension = videoExtensions.some(ext => fileName.endsWith(ext));
    
    // Verificar se contém palavras-chave de vídeo
    const hasVideoKeyword = urlLower.includes('video') || 
                           urlLower.includes('movie') ||
                           urlLower.includes('/videos/') ||
                           urlLower.includes('_video_') ||
                           urlLower.includes('-video-') ||
                           fileName.includes('video');
    
    const result = hasVideoExtension || hasVideoKeyword;
    
    console.log(`🎬 SpaceDetailsTabs - DETECÇÃO DE VÍDEO:`, {
      url: url,
      fileName: fileName,
      hasVideoExtension,
      hasVideoKeyword,
      isVideo: result,
      matchingExtensions: videoExtensions.filter(ext => fileName.endsWith(ext))
    });
    
    return result;
  };

  // Separar e contar mídias com logs detalhados
  const videos = photoUrls.filter(url => isVideo(url));
  const images = photoUrls.filter(url => !isVideo(url));
  const totalMedia = photoUrls.length;
  
  console.log(`📊 SpaceDetailsTabs - ESTATÍSTICAS FINAIS:`, {
    totalUrls: photoUrls.length,
    images: images.length,
    videos: videos.length,
    spaceName: space.name,
    allUrls: photoUrls,
    videoUrls: videos,
    imageUrls: images
  });

  // URLs já vêm ordenadas do hook (imagens primeiro, vídeos por último)
  const sortedPhotoUrls = [...images, ...videos];

  console.log(`🎯 SpaceDetailsTabs - ORDEM FINAL:`, {
    sortedUrls: sortedPhotoUrls,
    totalFinal: sortedPhotoUrls.length,
    orderedVideos: videos,
    orderedImages: images
  });

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
        <TabsTrigger value="photos" className="flex-1">
          Mídia ({totalMedia}) {videos.length > 0 && `- ${videos.length} vídeo${videos.length !== 1 ? 's' : ''}`}
        </TabsTrigger>
        <TabsTrigger value="location" className="flex-1">Localização</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details" className="mt-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-start">
            <Home className="text-gray-400 mt-1 mr-3" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Descrição</p>
              <p className="text-sm text-gray-700 mt-1">
                {space.description || "Nenhuma descrição fornecida"}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <Phone className="text-gray-400 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Telefone</p>
                <p className="text-sm text-gray-700">{space.phone || "Não informado"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <User className="text-gray-400 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Capacidade</p>
                <p className="text-sm text-gray-700">
                  {space.capacity ? `${space.capacity} pessoas` : "Não informado"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center">
            <DollarSign className="text-gray-400 mr-3" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">Valor</p>
              <p className="text-sm text-gray-700">
                {space.price ? `R$ ${space.price}` : "Não informado"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start">
            <MapPin className="text-gray-400 mt-1 mr-3" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">Endereço</p>
              <p className="text-sm text-gray-700">
                {space.address && space.number ? 
                  `${space.address}, ${space.number} - ${space.state || ''}, ${space.zip_code || ''}`.trim() :
                  "Endereço não informado"
                }
              </p>
            </div>
          </div>
        </Card>

        {space.categories && space.categories.length > 0 && (
          <Card className="p-4">
            <div className="flex items-start">
              <Tag className="text-gray-400 mt-1 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  {space.categories.map((category, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <p className="text-sm font-medium text-gray-500 mb-3">Comodidades</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center">
              {space.wifi ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Wi-Fi</span>
            </div>
            <div className="flex items-center">
              {space.parking ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Estacionamento</span>
            </div>
            <div className="flex items-center">
              {space.sound_system ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Sistema de som</span>
            </div>
            <div className="flex items-center">
              {space.air_conditioning ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Ar-condicionado</span>
            </div>
            <div className="flex items-center">
              {space.kitchen ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Cozinha</span>
            </div>
            <div className="flex items-center">
              {space.pool ? 
                <Check size={16} className="text-green-500 mr-2" /> : 
                <X size={16} className="text-red-500 mr-2" />
              }
              <span className="text-sm text-gray-700">Piscina</span>
            </div>
          </div>
        </Card>
      </TabsContent>
      
      <TabsContent value="photos" className="mt-4">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              Fotos e Vídeos do Espaço 
              {totalMedia > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({images.length} imagem{images.length !== 1 ? 's' : ''}, {videos.length} vídeo{videos.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>
            {onRefreshPhotos && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("🔄 BOTÃO RECARREGAR clicado");
                  onRefreshPhotos();
                }}
                disabled={photosLoading}
              >
                <RefreshCw size={16} className={`mr-2 ${photosLoading ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
            )}
          </div>
          
          {photosLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-gray-500">Carregando fotos e vídeos...</p>
            </div>
          ) : !sortedPhotoUrls || sortedPhotoUrls.length === 0 ? (
            <div className="text-center py-8">
              <Image size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Nenhuma foto ou vídeo disponível</p>
              <p className="text-xs text-gray-400 mt-1">
                Verifique se as fotos/vídeos foram enviados corretamente
              </p>
              {onRefreshPhotos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshPhotos}
                  className="mt-3"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Tentar Recarregar
                </Button>
              )}
            </div>
          ) : (
            <>
              {console.log("🎬 RENDERIZAÇÃO - Iniciando renderização das mídias:", {
                images: images.length,
                videos: videos.length,
                sortedUrls: sortedPhotoUrls.length,
                spaceName: space.name
              })}

              {/* Mostrar imagens primeiro */}
              {images.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-3 text-gray-700">
                    📸 Imagens ({images.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {images.map((url, index) => {
                      console.log(`🖼️ RENDERIZANDO imagem ${index + 1}:`, url);
                      return (
                        <div key={`image-${index}`} className="relative">
                          <img 
                            src={url} 
                            alt={`${space.name} ${index + 1}`}
                            className="w-full h-40 object-cover rounded-md border"
                            onLoad={() => {
                              console.log(`✓ IMAGEM ${index + 1} carregada com sucesso:`, url);
                            }}
                            onError={(e) => {
                              console.error(`✗ ERRO ao carregar imagem ${index + 1}:`, url);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gYW8gY2FycmVnYXIgaW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            📸 {index + 1}/{images.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mostrar vídeos por último */}
              {videos.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-3 text-gray-700">
                    🎬 Vídeos ({videos.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map((url, index) => {
                      console.log(`🎬 RENDERIZANDO vídeo ${index + 1}:`, url);
                      return (
                        <div key={`video-${index}`} className="relative">
                          <video
                            src={url}
                            controls
                            className="w-full h-40 object-cover rounded-md border"
                            preload="metadata"
                            onLoadedData={() => {
                              console.log(`✓ VÍDEO ${index + 1} carregado com sucesso:`, url);
                            }}
                            onError={(e) => {
                              console.error(`✗ ERRO ao carregar vídeo ${index + 1}:`, url);
                              console.error("Detalhes do erro do vídeo:", e);
                            }}
                          >
                            <p className="text-gray-500 p-4">
                              Seu navegador não suporta reprodução de vídeo.
                              <br />
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                Clique aqui para assistir
                              </a>
                            </p>
                          </video>
                          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            🎬 {index + 1}/{videos.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Informações resumidas com debug */}
              <div className="mt-4 text-center border-t pt-4">
                <h3 className="text-lg font-medium">{space.name}</h3>
                <p className="text-sm text-gray-500 mt-2">
                  📊 {totalMedia} mídia{totalMedia !== 1 ? 's' : ''} • 
                  📸 {images.length} imagem{images.length !== 1 ? 's' : ''} • 
                  🎬 {videos.length} vídeo{videos.length !== 1 ? 's' : ''}
                </p>
                
                {/* Botão de debug melhorado */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    console.log("🔍 DEBUG MANUAL COMPLETO - Estado atual:", {
                      space: space.name,
                      spaceId: space.id,
                      photoUrls,
                      videos,
                      images,
                      sortedPhotoUrls,
                      detectionResults: photoUrls.map(url => ({
                        url,
                        isVideo: isVideo(url),
                        fileName: url.split('/').pop()
                      }))
                    });
                  }}
                >
                  🔍 Debug Completo
                </Button>
              </div>
            </>
          )}
        </Card>
      </TabsContent>
      
      <TabsContent value="location" className="mt-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Endereço Completo</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{space.address && space.number ? `${space.address}, ${space.number}` : "Endereço não informado"}</p>
                <p>{space.state ? `Estado: ${space.state}` : "Estado não informado"}</p>
                <p>{space.zip_code ? `CEP: ${space.zip_code}` : "CEP não informado"}</p>
              </div>
            </div>
            
            {space.latitude && space.longitude ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mapa</h4>
                <div className="h-[200px] bg-gray-100 rounded-md overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw&q=${space.latitude},${space.longitude}&zoom=15`}
                    allowFullScreen
                    title={`Localização de ${space.name}`}
                  ></iframe>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Coordenadas: {space.latitude}, {space.longitude}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Coordenadas não definidas</p>
                <p className="text-xs text-gray-400 mt-1">
                  O proprietário não definiu a localização exata no mapa
                </p>
              </div>
            )}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default SpaceDetailsTabs;
