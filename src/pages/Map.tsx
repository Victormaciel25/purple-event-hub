import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";
import { Wrapper } from "@googlemaps/react-wrapper";
import AddressAutoComplete from "@/components/AddressAutoComplete";

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

const Map = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();

  // Efeito para carregar espaços ao montar o componente
  useEffect(() => {
    fetchSpaces();
  }, []);

  // Efeito para filtrar espaços com base na busca
  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredSpaces(spaces);
    } else {
      // Filtra espaços com base na busca
      const lowercaseSearch = searchValue.toLowerCase();
      const filtered = spaces.filter(space => 
        space.name.toLowerCase().includes(lowercaseSearch) || 
        `${space.address}, ${space.number} - ${space.state}`.toLowerCase().includes(lowercaseSearch) ||
        (space.zipCode && space.zipCode.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredSpaces(filtered);
    }
  }, [searchValue, spaces]);

  // Função para buscar espaços no Supabase
  const fetchSpaces = async () => {
    setLoading(true);
    try {
      // Buscar apenas espaços aprovados com latitude e longitude válidos
      const { data: spacesData, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, latitude, longitude, zip_code, space_photos(storage_path)")
        .eq("status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      
      if (error) {
        throw error;
      }

      if (spacesData) {
        // Processar os espaços para incluir URLs de imagens
        const spacesWithImages = await Promise.all(
          spacesData.map(async (space) => {
            let imageUrl = undefined;

            if (space.space_photos && space.space_photos.length > 0) {
              const { data: urlData } = await supabase.storage
                .from('spaces')
                .createSignedUrl(space.space_photos[0].storage_path, 3600);
                
              if (urlData) {
                imageUrl = urlData.signedUrl;
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
              imageUrl: imageUrl
            };
          })
        );
        
        setSpaces(spacesWithImages);
        setFilteredSpaces(spacesWithImages);
      }
    } catch (error) {
      console.error("Erro ao buscar espaços:", error);
      toast.error("Erro ao carregar espaços");
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceClick = (spaceId: string) => {
    // Navegar para a página de detalhes do espaço com a rota correta
    navigate(`/event-space/${spaceId}`);
  };

  // Handler para quando um local é selecionado pelo componente AddressAutoComplete
  const handleLocationSelected = (location: GeocodingResult) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setSearchValue(location.locationName);
    
    // Se o mapa já foi carregado, ajusta a visualização para a nova localização
    if (mapRef.current) {
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
      mapRef.current.setZoom(14);
    }
    
    toast.success("Localização encontrada!");
    setSearchError(null);
  };

  return (
    <Wrapper
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={["places"]}
    >
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
          <LocationMap 
            onLocationSelected={() => {}} 
            viewOnly={true}
            spaces={filteredSpaces}
            onSpaceClick={handleSpaceClick}
            isLoading={loading}
            initialLocation={mapCenter}
            onMapLoad={(map) => { mapRef.current = map; }}
            keepPinsVisible={false}
          />
        </div>
      </div>
    </Wrapper>
  );
};

export default Map;
