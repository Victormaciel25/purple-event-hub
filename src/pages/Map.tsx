
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import { supabase } from "@/integrations/supabase/client";
import { getGoogleMapsApiKey } from "@/config/app-config";

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
const CURRENT_USER_KEY = 'current_map_user';

const Map: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyLoading, setApiKeyLoading] = useState<boolean>(true);

  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();

  // Load Google Maps API key
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await getGoogleMapsApiKey();
        setApiKey(key);
      } catch (error) {
        console.error('Failed to load Google Maps API key:', error);
        setSearchError('Erro ao carregar configuração do mapa');
      } finally {
        setApiKeyLoading(false);
      }
    };

    loadApiKey();
  }, []);

  // Função para obter localização atual do usuário
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const userLoc = { lat: coords.latitude, lng: coords.longitude };
          console.log('📍 MAP: Localização atual obtida:', userLoc);
          resolve(userLoc);
        },
        (err) => {
          console.warn("❌ MAP: Erro ao obter localização:", err);
          reject(err);
        }
      );
    });
  };

  // Função para obter a última posição salva do mapa
  const getLastMapPosition = (): { lat: number; lng: number } | null => {
    try {
      const saved = localStorage.getItem(LAST_MAP_POSITION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Função para salvar a posição atual do mapa
  const saveMapPosition = (position: { lat: number; lng: number }) => {
    localStorage.setItem(LAST_MAP_POSITION_KEY, JSON.stringify(position));
    console.log('🗺️ MAP: Posição salva:', position);
  };

  // Inicialização do mapa
  useEffect(() => {
    const initializeMap = async () => {
      console.log('🚀 MAP: Inicializando mapa...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const storedUserId = localStorage.getItem(CURRENT_USER_KEY);

        console.log('🔐 MAP: Estado inicial:', {
          currentUserId,
          storedUserId,
          hasSession: !!session
        });

        // Se há um usuário logado
        if (currentUserId) {
          // Se é um usuário diferente do armazenado, limpar dados e usar localização atual
          if (storedUserId && currentUserId !== storedUserId) {
            console.log('👤 MAP: Usuário diferente detectado - usando localização atual');
            localStorage.removeItem(LAST_MAP_POSITION_KEY);
            localStorage.setItem(CURRENT_USER_KEY, currentUserId);
            
            try {
              const currentLocation = await getCurrentLocation();
              setMapCenter(currentLocation);
              saveMapPosition(currentLocation);
            } catch (error) {
              console.warn("❌ MAP: Erro ao obter localização atual:", error);
              setSearchError("Não foi possível obter sua localização");
            }
          } else {
            // Mesmo usuário ou primeiro login - verificar se tem posição salva
            localStorage.setItem(CURRENT_USER_KEY, currentUserId);
            const lastPosition = getLastMapPosition();
            
            if (lastPosition) {
              console.log('🗺️ MAP: Usando última posição salva:', lastPosition);
              setMapCenter(lastPosition);
            } else {
              console.log('🗺️ MAP: Nenhuma posição salva - obtendo localização atual');
              try {
                const currentLocation = await getCurrentLocation();
                setMapCenter(currentLocation);
                saveMapPosition(currentLocation);
              } catch (error) {
                console.warn("❌ MAP: Erro ao obter localização atual:", error);
                setSearchError("Não foi possível obter sua localização");
              }
            }
          }
        } else {
          // Sem usuário logado - usar localização atual sempre
          console.log('🔓 MAP: Sem usuário logado - usando localização atual');
          localStorage.removeItem(CURRENT_USER_KEY);
          
          try {
            const currentLocation = await getCurrentLocation();
            setMapCenter(currentLocation);
          } catch (error) {
            console.warn("❌ MAP: Erro ao obter localização:", error);
            setSearchError("Não foi possível obter sua localização");
          }
        }
      } catch (error) {
        console.error("💥 MAP: Erro na inicialização:", error);
        setSearchError("Erro ao inicializar o mapa");
      } finally {
        setLoading(false);
      }
    };

    if (!apiKeyLoading) {
      initializeMap();
    }
  }, [apiKeyLoading]);

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

  // Função para salvar posição quando o usuário move o mapa manualmente
  const handleMapDrag = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newPosition = { lat: center.lat(), lng: center.lng() };
        saveMapPosition(newPosition);
        console.log('🗺️ MAP: Posição salva após movimento manual:', newPosition);
      }
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    navigate(`/event-space/${spaceId}`);
  };

  if (apiKeyLoading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-iparty" />
        <span className="ml-2">Carregando configuração do mapa...</span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
        <div className="mb-2 p-4 bg-red-100 text-red-700 rounded-md">
          Erro ao carregar configuração do mapa. Tente recarregar a página.
        </div>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} libraries={["places"]}>
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
