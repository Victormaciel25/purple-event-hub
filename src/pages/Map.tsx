
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";
import { useUserLocation } from "@/hooks/useUserLocation";

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

const Map: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();
  
  // Usar hook centralizado de localização
  const { location: userLocation, loading: locationLoading, error: locationError } = useUserLocation();

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
    console.log('🗺️ MAP: Position saved:', position);
  };

  // Inicialização do mapa com localização otimizada
  useEffect(() => {
    console.log('🚀 MAP: Initializing map...');
    
    // Priorizar localização do usuário, depois posição salva
    if (userLocation) {
      console.log('📍 MAP: Using user location:', userLocation);
      setMapCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
      saveMapPosition({ lat: userLocation.latitude, lng: userLocation.longitude });
      setSearchError(null);
    } else if (!locationLoading && !mapCenter) {
      // Se não conseguiu obter localização, usar posição salva ou São Paulo como fallback
      const lastPosition = getLastMapPosition();
      if (lastPosition) {
        console.log('🗺️ MAP: Using saved position:', lastPosition);
        setMapCenter(lastPosition);
      } else {
        console.log('🏙️ MAP: Using São Paulo as fallback');
        const fallbackPosition = { lat: -23.5505, lng: -46.6333 }; // São Paulo
        setMapCenter(fallbackPosition);
        saveMapPosition(fallbackPosition);
      }
      
      if (locationError) {
        setSearchError(locationError);
      }
    }
  }, [userLocation, locationLoading, locationError, mapCenter]);

  // Sempre que mapCenter muda, centraliza o mapa
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      mapRef.current.panTo(mapCenter);
      mapRef.current.setZoom(14);
    }
  }, [mapCenter]);

  // Carrega espaços do Supabase de forma otimizada
  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      console.log("🔍 MAP: Fetching approved spaces with photos...");
      
      // Consulta otimizada com JOIN para reduzir requests
      const spacesPromise = supabase
        .from("spaces")
        .select(`
          id, 
          name, 
          address, 
          number, 
          state, 
          latitude, 
          longitude, 
          zip_code,
          space_photos!inner (
            storage_path
          )
        `)
        .eq("status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(1, { foreignTable: 'space_photos' }); // Apenas primeira foto

      const spacesResult = await Promise.race([
        spacesPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Spaces query timeout')), 8000)
        )
      ]);

      const { data: spacesData, error } = spacesResult as any;

      if (error) {
        console.error("❌ MAP: Error fetching spaces:", error);
        throw error;
      }

      console.log("📋 MAP: Spaces found:", spacesData?.length || 0);

      // Processar espaços de forma mais eficiente
      const spacesWithImages = (spacesData || []).map((space) => {
        let imageUrl: string | undefined;
        
        if (space.space_photos?.length) {
          const firstPhoto = space.space_photos[0];
          
          if (firstPhoto.storage_path?.startsWith('http')) {
            imageUrl = firstPhoto.storage_path;
          } else {
            // Usar URL pública (mais rápida)
            const { data: urlData } = supabase.storage
              .from("spaces")
              .getPublicUrl(firstPhoto.storage_path);
            
            imageUrl = urlData?.publicUrl || "";
          }
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
      });

      console.log("✨ MAP: Spaces processed:", spacesWithImages.length);

      setSpaces(spacesWithImages);
      setFilteredSpaces(spacesWithImages);
    } catch (error) {
      console.error("💥 MAP: Error fetching spaces:", error);
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
        console.log('🗺️ MAP: Position saved after manual movement:', newPosition);
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
          {loading || locationLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-8 w-8 text-iparty" />
              <span className="text-sm text-gray-600">
                {locationLoading ? "Obtendo sua localização..." : "Carregando espaços..."}
              </span>
            </div>
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
