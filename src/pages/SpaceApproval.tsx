
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Check, 
  X, 
  ArrowLeft, 
  MapPin, 
  Home, 
  User, 
  Phone,
  Image
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

type SpaceWithProfileInfo = {
  id: string;
  name: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  photo_count?: number;
};

type SpaceDetailsType = SpaceWithProfileInfo & {
  phone: string;
  description: string;
  address: string;
  state: string;
  number: string;
  zip_code: string;
  price: string;
  capacity: string;
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
  latitude: number | null;
  longitude: number | null;
  rejection_reason: string | null;
  photos?: { id: string; storage_path: string }[];
};

const SpaceApproval = () => {
  const [spaces, setSpaces] = useState<SpaceWithProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<SpaceDetailsType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const { isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace?.photos) {
      fetchPhotoUrls(selectedSpace.photos);
    }
  }, [selectedSpace]);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          created_at,
          status,
          user_id,
          profiles:user_id (
            first_name, 
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Count photos for each space
      const spacesWithCounts = await Promise.all(
        (data || []).map(async (space) => {
          const { count } = await supabase
            .from("space_photos")
            .select("id", { count: "exact" })
            .eq("space_id", space.id);

          return {
            ...space,
            photo_count: count || 0
          };
        })
      );

      setSpaces(spacesWithCounts);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      toast.error("Erro ao buscar espaços");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaceDetails = async (spaceId: string) => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          *,
          profiles:user_id (
            first_name, 
            last_name
          ),
          photos:space_photos (
            id, 
            storage_path
          )
        `)
        .eq("id", spaceId)
        .single();

      if (error) {
        throw error;
      }

      setSelectedSpace(data);
      setSheetOpen(true);
    } catch (error) {
      console.error("Error fetching space details:", error);
      toast.error("Erro ao buscar detalhes do espaço");
    }
  };

  const fetchPhotoUrls = async (photos: { id: string; storage_path: string }[]) => {
    try {
      const urls = await Promise.all(
        photos.map(async (photo) => {
          const { data, error } = await supabase.storage
            .from('spaces')
            .createSignedUrl(photo.storage_path, 3600);
          
          if (error) throw error;
          return data.signedUrl;
        })
      );
      
      setPhotoUrls(urls);
    } catch (error) {
      console.error("Error fetching photo URLs:", error);
      toast.error("Erro ao carregar fotos");
    }
  };

  const approveSpace = async () => {
    if (!selectedSpace) return;

    try {
      const { error } = await supabase
        .from("spaces")
        .update({ status: "approved" })
        .eq("id", selectedSpace.id);

      if (error) throw error;
      
      toast.success("Espaço aprovado com sucesso!");
      setSheetOpen(false);
      fetchSpaces();
    } catch (error) {
      console.error("Error approving space:", error);
      toast.error("Erro ao aprovar espaço");
    }
  };

  const rejectSpace = async () => {
    if (!selectedSpace) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para rejeição");
      return;
    }

    try {
      const { error } = await supabase
        .from("spaces")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason
        })
        .eq("id", selectedSpace.id);

      if (error) throw error;
      
      toast.success("Espaço rejeitado");
      setSheetOpen(false);
      setRejectionReason("");
      fetchSpaces();
    } catch (error) {
      console.error("Error rejecting space:", error);
      toast.error("Erro ao rejeitar espaço");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pendente</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Aprovado</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Rejeitado</span>;
    }
  };

  if (roleLoading) {
    return <div className="container px-4 py-6 flex items-center justify-center h-[80vh]">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="mr-2 p-0 h-auto">
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold">Aprovação de Espaços</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">Carregando espaços...</div>
        ) : spaces.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Nenhum espaço encontrado para aprovação.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spaces.map((space) => (
                <TableRow key={space.id}>
                  <TableCell>{space.name}</TableCell>
                  <TableCell>
                    {space.profiles?.first_name} {space.profiles?.last_name}
                  </TableCell>
                  <TableCell>{formatDate(space.created_at)}</TableCell>
                  <TableCell>{space.photo_count || 0}</TableCell>
                  <TableCell>{getStatusBadge(space.status)}</TableCell>
                  <TableCell>
                    <Button 
                      onClick={() => fetchSpaceDetails(space.id)}
                      variant="outline" 
                      size="sm"
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {selectedSpace && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedSpace.name}</SheetTitle>
              <SheetDescription>
                Submetido por {selectedSpace.profiles?.first_name} {selectedSpace.profiles?.last_name} em {formatDate(selectedSpace.created_at)}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
                <TabsTrigger value="photos" className="flex-1">Fotos</TabsTrigger>
                <TabsTrigger value="location" className="flex-1">Localização</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-start">
                        <Home className="text-gray-400 mt-1 mr-3" size={18} />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Descrição</p>
                          <p className="text-sm">{selectedSpace.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center">
                          <Phone className="text-gray-400 mr-3" size={18} />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Telefone</p>
                            <p className="text-sm">{selectedSpace.phone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center">
                          <User className="text-gray-400 mr-3" size={18} />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Capacidade</p>
                            <p className="text-sm">{selectedSpace.capacity} pessoas</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center">
                        <MapPin className="text-gray-400 mr-3" size={18} />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Endereço</p>
                          <p className="text-sm">
                            {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}, {selectedSpace.zip_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-500 mb-2">Comodidades</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                          {selectedSpace.wifi ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Wi-Fi</span>
                        </div>
                        <div className="flex items-center">
                          {selectedSpace.parking ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Estacionamento</span>
                        </div>
                        <div className="flex items-center">
                          {selectedSpace.sound_system ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Sistema de som</span>
                        </div>
                        <div className="flex items-center">
                          {selectedSpace.air_conditioning ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Ar-condicionado</span>
                        </div>
                        <div className="flex items-center">
                          {selectedSpace.kitchen ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Cozinha</span>
                        </div>
                        <div className="flex items-center">
                          {selectedSpace.pool ? 
                            <Check size={16} className="text-green-500 mr-1" /> : 
                            <X size={16} className="text-red-500 mr-1" />
                          }
                          <span className="text-sm">Piscina</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="photos" className="mt-4">
                <div className="space-y-4">
                  {photoUrls.length === 0 ? (
                    <div className="text-center py-8">
                      <Image size={48} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhuma foto disponível</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {photoUrls.map((url, index) => (
                        <img 
                          key={index} 
                          src={url} 
                          alt={`Espaço ${selectedSpace.name} ${index + 1}`}
                          className="w-full h-40 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="location" className="mt-4">
                {selectedSpace.latitude && selectedSpace.longitude ? (
                  <div className="h-[300px] bg-gray-100 rounded-md overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${selectedSpace.latitude},${selectedSpace.longitude}`}
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">Localização não definida</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {selectedSpace.status === "pending" && (
              <div className="mt-8 space-y-4">
                <Textarea
                  placeholder="Motivo da rejeição (obrigatório para rejeitar)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                
                <div className="flex justify-between">
                  <Button 
                    variant="destructive" 
                    onClick={rejectSpace}
                  >
                    <X size={16} className="mr-2" />
                    Rejeitar
                  </Button>
                  
                  <Button 
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={approveSpace}
                  >
                    <Check size={16} className="mr-2" />
                    Aprovar
                  </Button>
                </div>
              </div>
            )}
            
            {selectedSpace.status === "rejected" && (
              <div className="mt-6 p-4 bg-red-50 rounded-md">
                <h4 className="font-medium text-red-700">Motivo da rejeição:</h4>
                <p className="text-red-600">{selectedSpace.rejection_reason || "Nenhum motivo fornecido"}</p>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default SpaceApproval;
