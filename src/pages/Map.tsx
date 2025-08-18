
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";

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

// Helper para validar localização
const isValidLocation = (location: { lat: number; lng: number } | null): boolean => {
  if (!location) return false;
  const { lat, lng } = location;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
};

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
      const parsed = saved ? JSON.parse(saved) : null;
      return isValidLocation(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const saveMapPosition = (position: { lat: number; lng: number }) => {
    if (isValidLocation(position)) {
      localStorage.setItem(LAST_MAP_POSITION_KEY, JSON.stringify(position));
    }
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

  // Inicialização do centro do mapa com VALIDAÇÃO ROBUSTA
  useEffect(() => {
    if (mapCenter) return; // Só inicializar uma vez

    console.log('🗺️ MAP: Initializing center with validation...');
    
    let initialCenter: { lat: number; lng: number };

    // PRIORIDADE 1: Localização do usuário (SE VÁLIDA)
    if (userLocation && isValidLocation(userLocation)) {
      console.log('📍 MAP: Using VALID user location:', userLocation);
      initialCenter = userLocation;
    } else {
      if (userLocation) {
        console.warn('⚠️ MAP: User location is INVALID:', userLocation);
      }
      
      // PRIORIDADE 2: Posição salva (SE VÁLIDA)
      const lastPosition = getLastMapPosition();
      if (lastPosition) {
        console.log('💾 MAP: Using VALID saved position:', lastPosition);
        initialCenter = lastPosition;
      } else {
        // PRIORIDADE 3: Fallback São Paulo
        console.log('🏙️ MAP: Using São Paulo fallback');
        initialCenter = SAO_PAULO_CENTER;
      }
    }

    console.log('🎯 MAP: Final map center:', initialCenter);
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
    if (isValidLocation(newPosition)) {
      setMapCenter(newPosition);
      saveMapPosition(newPosition);
      toast.success("Localização encontrada!");
    } else {
      console.error('❌ MAP: Invalid location selected:', newPosition);
      toast.error("Localização inválida");
    }
  };

  const handleMapDrag = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newPosition = { lat: center.lat(), lng: center.lng() };
        if (isValidLocation(newPosition)) {
          saveMapPosition(newPosition);
        }
      }
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    navigate(`/event-space/${spaceId}`);
  };

  // Estados de carregamento mais precisos
  const isDataLoading = dataLoading;
  const isMapReady = mapCenter && isValidLocation(mapCenter);
  const showLoader = isDataLoading || !isMapReady;

  if (showLoader) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
        <div className="mb-6">
          <AddressAutoComplete
            onLocationSelected={handleLocationSelected}
            initialValue={searchValue}
            placeholder="Buscar por endereço, cidade ou CEP..."
          />
        </div>
        <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin h-8 w-8 text-iparty" />
            <span className="text-sm text-gray-600">
              {isDataLoading ? "Carregando dados..." : "Preparando mapa..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
        <div className="mb-6">
          <AddressAutoComplete
            onLocationSelected={handleLocationSelected}
            initialValue={searchValue}
            placeholder="Buscar por endereço, cidade ou CEP..."
          />
        </div>

        <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
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
        </div>
      </div>
    
  );
};

export default Map;
