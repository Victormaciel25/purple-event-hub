
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";

type Space = {
  id: string;
  name: string;
  address: string;
  number: string;
  state: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  zipCode?: string;
};

type GeocodingResult = {
  lat: number;
  lng: number;
  locationName: string;
};

const LAST_MAP_POSITION_KEY = 'last_map_position';
const LAST_USER_ID_KEY = 'last_user_id';

const Map: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();

  // Função para verificar se é uma nova sessão (baseada no usuário)
  const isNewSession = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    
    const lastUserId = localStorage.getItem(LAST_USER_ID_KEY);
    return lastUserId !== user.id;
  };

  // Função para marcar a sessão atual
  const updateSessionUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(LAST_USER_ID_KEY, user.id);
    }
  };

  // Função para limpar dados da sessão anterior
  const clearPreviousSession = () => {
    sessionStorage.removeItem(LAST_MAP_POSITION_KEY);
  };

  // Função para salvar a posição atual do mapa
  const saveMapPosition = (position: { lat: number; lng: number }) => {
    sessionStorage.setItem(LAST_MAP_POSITION_KEY, JSON.stringify(position));
  };

  // Função para obter a última posição salva do mapa
  const getLastMapPosition = (): { lat: number; lng: number } | null => {
    try {
      const saved = sessionStorage.getItem(LAST_MAP_POSITION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Inicialização do mapa
  useEffect(() => {
    const initializeMap = async () => {
      // Verificar se é uma nova sessão (novo usuário)
      const isNew = await isNewSession();
      
      if (isNew) {
        console.log('🗺️ MAP: Nova sessão detectada - limpando dados anteriores');
        clearPreviousSession();
        await updateSessionUser();
      } else {
        // Sessão contínua - tenta usar a última posição salva
        const lastPosition = getLastMapPosition();
        if (lastPosition) {
          console.log('🗺️ MAP: Sessão contínua - usando última posição salva:', lastPosition);
          setMapCenter(lastPosition);
          setLoading(false);
          return;
        }
      }

      // Nova sessão ou sem posição salva - obter localização atual
      console.log('🗺️ MAP: Obtendo localização atual do usuário...');
      
      if (!navigator.geolocation) {
        console.warn('🗺️ MAP: Geolocalização não suportada');
        setSearchError("Geolocalização não suportada neste navegador");
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const userLoc = { lat: coords.latitude, lng: coords.longitude };
          console.log('📍 MAP: Localização atual obtida:', userLoc);
          setMapCenter(userLoc);
          saveMapPosition(userLoc); // Salva a posição inicial
          setLoading(false);
        },
        (err) => {
          console.warn("❌ MAP: Erro ao obter localização:", err);
          setSearchError("Não foi possível obter sua localização");
          setLoading(false);
        }
      );
    };

    initializeMap();
  }, []);

  // Sempre que mapCenter muda, centraliza o mapa
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      mapRef.current.panTo(mapCenter);
      mapRef.current.setZoom(14);
    }
  }, [mapCenter]);

  // Carrega espaços do Supabase
  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      console.log("🔍 MAP: Buscando espaços aprovados...");
      
      const { data: spacesData, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, latitude, longitude, zip_code, space_photos(storage_path)")
        .eq("status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) {
        console.error("❌ MAP: Erro ao buscar espaços:", error);
        throw error;
      }

      console.log("📋 MAP: Espaços encontrados:", spacesData?.length || 0);

      const spacesWithImages = await Promise.all(
        (spacesData || []).map(async (space) => {
          let imageUrl: string | undefined;
          
          console.log(`🖼️ MAP: Processando imagens para espaço "${space.name}":`, {
            id: space.id,
            photos: space.space_photos?.length || 0,
            firstPhoto: space.space_photos?.[0]
          });
          
          if (space.space_photos?.length) {
            const firstPhoto = space.space_photos[0];
            console.log("📸 MAP: Primeira foto encontrada:", {
              storage_path: firstPhoto.storage_path,
              isFullURL: firstPhoto.storage_path?.startsWith('http')
            });
            
            try {
              // Se já é uma URL completa, usar diretamente
              if (firstPhoto.storage_path?.startsWith('http')) {
                imageUrl = firstPhoto.storage_path;
                console.log("✅ MAP: Usando URL completa:", imageUrl);
              } else {
                // Criar URL pública a partir do storage path
                const { data: urlData } = supabase.storage
                  .from("spaces")
                  .getPublicUrl(firstPhoto.storage_path);
                
                if (urlData?.publicUrl) {
                  imageUrl = urlData.publicUrl;
                  console.log("✅ MAP: URL pública criada:", imageUrl);
                  
                  // Testar acessibilidade
                  try {
                    const response = await fetch(imageUrl, { method: 'HEAD' });
                    console.log("🔍 MAP: Teste de acesso:", {
                      url: imageUrl,
                      status: response.status,
                      ok: response.ok
                    });
                  } catch (fetchError) {
                    console.warn("⚠️ MAP: URL pode não estar acessível:", fetchError);
                  }
                } else {
                  console.warn("⚠️ MAP: Falha ao criar URL pública para:", firstPhoto.storage_path);
                }
              }
            } catch (imageError) {
              console.error("❌ MAP: Erro ao processar imagem:", imageError);
            }
          } else {
            console.log("⚠️ MAP: Nenhuma foto encontrada para o espaço:", space.name);
          }
          
          return {
            id: space.id,
            name: space.name,
            address: space.address,
            number: space.number,
            state: space.state,
            latitude: Number(space.latitude),
            longitude: Number(space.longitude),
            zipCode: space.zip_code || "",
            imageUrl,
          };
        })
      );

      console.log("✨ MAP: Espaços processados com imagens:", spacesWithImages.map(s => ({
        name: s.name,
        hasImage: !!s.imageUrl,
        imageUrl: s.imageUrl
      })));

      setSpaces(spacesWithImages);
      setFilteredSpaces(spacesWithImages);
    } catch (error) {
      console.error("💥 MAP: Erro ao buscar espaços:", error);
      toast.error("Erro ao carregar espaços");
    } finally {
      setLoading(false);
    }
  };

  // Carrega espaços do Supabase
  useEffect(() => {
    fetchSpaces();
  }, []);

  // Filtra os espaços quando searchValue muda
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredSpaces(spaces);
      return;
    }
    const term = searchValue.toLowerCase();
    setFilteredSpaces(
      spaces.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        `${s.address}, ${s.number} - ${s.state}`.toLowerCase().includes(term) ||
        s.zipCode.toLowerCase().includes(term)
      )
    );
  }, [searchValue, spaces]);

  // Chamado pelo AddressAutoComplete
  const handleLocationSelected = (loc: GeocodingResult) => {
    const newPosition = { lat: loc.lat, lng: loc.lng };
    setMapCenter(newPosition);
    saveMapPosition(newPosition);
    setSearchError(null);
    toast.success("Localização encontrada!");
  };

  // Função para lidar com mudanças manuais na posição do mapa
  const handleMapPositionChange = (lat: number, lng: number) => {
    const newPosition = { lat, lng };
    setMapCenter(newPosition);
    saveMapPosition(newPosition);
  };

  // Função para salvar posição quando o usuário move o mapa manualmente
  const handleMapDrag = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newPosition = { lat: center.lat(), lng: center.lng() };
        saveMapPosition(newPosition);
      }
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    navigate(`/event-space/${spaceId}`);
  };

  return (
    <Wrapper apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
        <div className="mb-6">
          <AddressAutoComplete
            onLocationSelected={handleLocationSelected}
            initialValue={searchValue}
            placeholder="Buscar por endereço, cidade ou CEP..."
          />
        </div>

        {searchError && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-sm">
            {searchError}
          </div>
        )}

        <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
          {loading ? (
            <Loader2 className="animate-spin h-8 w-8 text-iparty" />
          ) : (
            <LocationMap
              viewOnly
              spaces={filteredSpaces}
              onSpaceClick={handleSpaceClick}
              initialLocation={mapCenter || undefined}
              onMapLoad={(mapInstance) => {
                mapRef.current = mapInstance;
                if (mapCenter) {
                  mapInstance.panTo(mapCenter);
                  mapInstance.setZoom(14);
                }
                
                // Adicionar listener para quando o usuário parar de arrastar o mapa
                mapInstance.addListener('dragend', handleMapDrag);
                mapInstance.addListener('zoom_changed', handleMapDrag);
              }}
              isLoading={false}
              keepPinsVisible={false}
              onLocationSelected={() => {}}
            />
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default Map;
