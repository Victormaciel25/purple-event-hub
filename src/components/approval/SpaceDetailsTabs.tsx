import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Image, MapPin, Home, User, Phone, DollarSign, Check, X, Tag, RefreshCw, Trash2, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SpaceWithProfile } from "@/types/approval";
import { useState } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface SpaceDetailsTabsProps {
  space: SpaceWithProfile;
  photoUrls: string[];
  photosLoading: boolean;
  onRefreshPhotos?: () => void;
  onDelete?: (spaceId: string, deletionReason: string) => void;
}

const SpaceDetailsTabs: React.FC<SpaceDetailsTabsProps> = ({ 
  space, 
  photoUrls, 
  photosLoading,
  onRefreshPhotos,
  onDelete
}) => {
  const totalPhotos = photoUrls.length;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAdmin, isSuperAdmin } = useUserRoles();

  // Debug log para verificar se o telefone está sendo passado
  console.log("📞 SPACE_DETAILS: Telefone do espaço:", space.phone);

  const handleDelete = async () => {
    if (!deleteReason.trim() || !onDelete) {
      return;
    }
    
    try {
      setIsDeleting(true);
      await onDelete(space.id, deleteReason);
    } catch (error) {
      console.error("Error deleting space:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">
            Fotos ({totalPhotos})
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

          <Card className="p-4">
            <div className="flex items-center">
              <Phone className="text-gray-400 mr-3" size={18} />
              <div>
                <p className="text-sm font-medium text-gray-500">Telefone de Contato</p>
                <p className="text-sm text-gray-700">{space.phone || "Não informado"}</p>
              </div>
            </div>
          </Card>

          {space.instagram && (
            <Card className="p-4">
              <div className="flex items-center">
                <Instagram className="text-gray-400 mr-3" size={18} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Instagram</p>
                  <a 
                    href={space.instagram.startsWith('http') ? space.instagram : `https://www.instagram.com/${space.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {space.instagram}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
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
          </div>

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
                Fotos do Espaço 
                {totalPhotos > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({totalPhotos} foto{totalPhotos !== 1 ? 's' : ''})
                  </span>
                )}
              </h3>
              {onRefreshPhotos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("🔄 Botão recarregar clicado");
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
                <p className="text-gray-500">Carregando fotos...</p>
              </div>
            ) : !photoUrls || photoUrls.length === 0 ? (
              <div className="text-center py-8">
                <Image size={48} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Nenhuma foto disponível</p>
                <p className="text-xs text-gray-400 mt-1">
                  Verifique se as fotos foram enviadas corretamente
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
                <div className="space-y-6">
                  {photoUrls.map((url, index) => (
                    <div key={`photo-${index}`} className="relative bg-gray-50 rounded-lg overflow-hidden">
                      <AspectRatio ratio={16 / 9} className="bg-muted">
                        <img 
                          src={url} 
                          alt={`${space.name} ${index + 1}`}
                          className="w-full h-full object-contain"
                          onLoad={() => {
                            console.log(`✓ Foto ${index + 1} carregada com sucesso:`, url);
                          }}
                          onError={(e) => {
                            console.error(`✗ Erro ao carregar foto ${index + 1}:`, url);
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gYW8gY2FycmVnYXIgaW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </AspectRatio>
                      <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        📸 {index + 1}/{photoUrls.length}
                      </div>
                      <div className="p-3 bg-white border-t">
                        <p className="text-sm text-gray-600">
                          Foto {index + 1} de {photoUrls.length}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center border-t pt-4">
                  <h3 className="text-lg font-medium">{space.name}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    📸 {totalPhotos} foto{totalPhotos !== 1 ? 's' : ''} para análise
                  </p>
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

      {/* Admin Delete Button */}
      {(isAdmin || isSuperAdmin) && (
        <Button
          variant="destructive"
          className="w-full mt-4"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2" size={18} />
          {isDeleting ? "Excluindo..." : "Excluir Espaço"}
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este espaço? Esta ação não pode ser
              desfeita e um email será enviado ao proprietário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da exclusão (obrigatório)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="mt-4"
            rows={3}
          />
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SpaceDetailsTabs;
