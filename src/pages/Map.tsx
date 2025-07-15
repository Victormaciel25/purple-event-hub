
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
const SAO_PAULO_CENTER = { lat: -23.5505, lng: -46.6333 };

const Map: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();
  
  // Hook de localização centralizado
  const { location: userLocation, loading: locationLoading } = useUserLocation();

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

  // Inicialização do centro do mapa (SIMPLIFICADA)
  useEffect(() => {
    if (mapCenter) return; // Só inicializar uma vez

    console.log('🗺️ MAP: Initializing center...');
    
    let initialCenter: { lat: number; lng: number };

    if (userLocation) {
      console.log('📍 MAP: Using user location');
      initialCenter = { lat: userLocation.latitude, lng: userLocation.longitude };
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

  // Carregar espaços (OTIMIZADO)
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        console.log("🚀 MAP: Fetching spaces...");
        const startTime = performance.now();

        // Query otimizada com JOIN
        const { data: spacesData, error } = await supabase
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
            space_photos!left (
              storage_path
            )
          `)
          .eq("status", "approved")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(1, { foreignTable: 'space_photos' });

        if (error) throw error;

        // Processar espaços de forma eficiente
        const processedSpaces = (spacesData || []).map((space) => {
          let imageUrl: string | undefined;
          
          if (space.space_photos?.length) {
            const firstPhoto = space.space_photos[0];
            if (firstPhoto.storage_path?.startsWith('http')) {
              imageUrl = firstPhoto.storage_path;
            } else {
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

        setSpaces(processedSpaces);
        setFilteredSpaces(processedSpaces);
        
        const endTime = performance.now();
        console.log(`✅ MAP: Spaces loaded in ${(endTime - startTime).toFixed(0)}ms:`, processedSpaces.length);

      } catch (error) {
        console.error("💥 MAP: Error fetching spaces:", error);
        toast.error("Erro ao carregar espaços");
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  // Filtrar espaços
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

  const isLoading = loading || locationLoading || !mapCenter;

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
                {locationLoading ? "Obtendo localização..." : "Carregando mapa..."}
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
