
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";
import { useAppData } from "@/hooks/useAppData";

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
const SAO_PAULO_CENTER = { lat: -23.5505, lng: -46.6333 };

const Map: React.FC = () => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // Usar dados centralizados
  const { spaces, loading: dataLoading, userLocation } = useAppData();
  
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Função utilitária para localStorage
  const getLastMapPosition = (): { lat: number; lng: number } | null => {
    try {
      const saved = localStorage.getItem(LAST_MAP_POSITION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveMapPosition = (position: { lat: number; lng: number }) => {
    localStorage.setItem(LAST_MAP_POSITION_KEY, JSON.stringify(position));
  };

  // Processar espaços do cache global
  useEffect(() => {
    console.log('🗺️ MAP: Processing cached spaces...');
    
    const processedSpaces: Space[] = spaces
      .filter(space => space.latitude && space.longitude)
      .map(space => ({
        id: space.id,
        name: space.name,
        address: space.address,
        number: space.number,
        state: space.state,
        latitude: space.latitude!,
        longitude: space.longitude!,
        imageUrl: space.photo_url || undefined,
        zipCode: undefined
      }));

    setFilteredSpaces(processedSpaces);
    console.log(`🗺️ MAP: Processed ${processedSpaces.length} spaces from cache`);
  }, [spaces]);

  // Inicialização do centro do mapa SIMPLIFICADA
  useEffect(() => {
    if (mapCenter) return; // Só inicializar uma vez

    console.log('🗺️ MAP: Initializing center...');
    
    let initialCenter: { lat: number; lng: number };

    if (userLocation) {
      console.log('📍 MAP: Using user location');
      initialCenter = userLocation;
    } else {
      const lastPosition = getLastMapPosition();
      if (lastPosition) {
        console.log('💾 MAP: Using saved position');
        initialCenter = lastPosition;
      } else {
        console.log('🏙️ MAP: Using São Paulo fallback');
        initialCenter = SAO_PAULO_CENTER;
      }
    }

    setMapCenter(initialCenter);
    saveMapPosition(initialCenter);
  }, [userLocation, mapCenter]);

  // Filtrar espaços por busca
  useEffect(() => {
    if (!searchValue.trim()) {
      const processedSpaces: Space[] = spaces
        .filter(space => space.latitude && space.longitude)
        .map(space => ({
          id: space.id,
          name: space.name,
          address: space.address,
          number: space.number,
          state: space.state,
          latitude: space.latitude!,
          longitude: space.longitude!,
          imageUrl: space.photo_url || undefined,
          zipCode: undefined
        }));
      setFilteredSpaces(processedSpaces);
      return;
    }
    
    const term = searchValue.toLowerCase();
    const filtered = spaces
      .filter(space => space.latitude && space.longitude)
      .filter(space =>
        space.name.toLowerCase().includes(term) ||
        `${space.address}, ${space.number} - ${space.state}`.toLowerCase().includes(term)
      )
      .map(space => ({
        id: space.id,
        name: space.name,
        address: space.address,
        number: space.number,
        state: space.state,
        latitude: space.latitude!,
        longitude: space.longitude!,
        imageUrl: space.photo_url || undefined,
        zipCode: undefined
      }));
    
    setFilteredSpaces(filtered);
  }, [searchValue, spaces]);

  // Handlers
  const handleLocationSelected = (loc: GeocodingResult) => {
    const newPosition = { lat: loc.lat, lng: loc.lng };
    setMapCenter(newPosition);
    saveMapPosition(newPosition);
    toast.success("Localização encontrada!");
  };

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

  const isLoading = dataLoading || !mapCenter;

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

        <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-8 w-8 text-iparty" />
              <span className="text-sm text-gray-600">
                {dataLoading ? "Carregando dados..." : "Carregando mapa..."}
              </span>
            </div>
          ) : (
            <LocationMap
              viewOnly
              spaces={filteredSpaces}
              onSpaceClick={handleSpaceClick}
              initialLocation={mapCenter}
              onMapLoad={(mapInstance) => {
                mapRef.current = mapInstance;
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
