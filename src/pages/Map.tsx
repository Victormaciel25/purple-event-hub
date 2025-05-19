import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GOOGLE_MAPS_API_KEY, EDGE_FUNCTIONS } from "@/config/app-config";
import { Wrapper } from "@googlemaps/react-wrapper";

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
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // Efeito para carregar espaços ao montar o componente
  useEffect(() => {
    fetchSpaces();
  }, []);

  // Novo useEffect com intervalo para inicializar o Autocomplete quando o Google Maps API estiver carregado
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places &&
        inputRef.current &&
        !autocompleteRef.current
      ) {
        console.log("Inicializando Autocomplete...");
        initializeAutocomplete();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
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

  // Inicializar o Google Places Autocomplete no input quando o Google Maps API estiver carregado
  const initializeAutocomplete = () => {
    if (inputRef.current && window.google && window.google.maps && window.google.maps.places) {
      const options = {
        componentRestrictions: { country: 'br' },
        fields: ['geometry', 'formatted_address', 'name', 'place_id'],
        types: ['geocode', 'establishment', 'address'],
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      // Evento quando um lugar é selecionado
      autocompleteRef.current.addListener('place_changed', () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        if (place && place.geometry && place.geometry.location) {
          handlePlaceSelected(place);
        }
      });
      
      console.log("Autocomplete inicializado com sucesso!");
    } else {
      console.error("Google Maps Places API not available");
    }
  };

  // Função para lidar com a seleção de um lugar a partir do Autocomplete
  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (place && place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      setMapCenter({ lat, lng });
      
      // Se o mapa já foi carregado, ajusta a visualização para a nova localização
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(14);
      }
      
      // Atualiza o valor de busca com o nome do lugar
      if (place.formatted_address) {
        setSearchValue(place.formatted_address);
      }
      
      toast.success("Localização encontrada!");
    }
  };

  // Função para geocodificar um endereço usando a edge function do Supabase
  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      console.log(`Chamando edge function para geocodificar: ${address}`);
      
      const response = await fetch(EDGE_FUNCTIONS.GEOCODE_ADDRESS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Resultado da geocodificação:', data);
        return data;
      } else {
        console.error('Erro na resposta da geocodificação:', data);
        return null;
      }
    } catch (error) {
      console.error("Erro ao chamar a função de geocodificação:", error);
      return null;
    }
  };

  // Função para geocodificar um endereço e atualizar o mapa
  const geocodeAddressAndUpdateMap = async (address: string) => {
    try {
      setSearchLoading(true);
      const geocodingResult = await geocodeAddress(address);
      
      if (geocodingResult) {
        setMapCenter({ lat: geocodingResult.lat, lng: geocodingResult.lng });
        
        // Se o mapa já foi carregado, ajusta a visualização para a nova localização
        if (mapRef.current) {
          mapRef.current.panTo({ lat: geocodingResult.lat, lng: geocodingResult.lng });
          mapRef.current.setZoom(14); // Ajusta para um nível de zoom apropriado
        }
        
        toast.success("Localização encontrada!");
      } else {
        setSearchError("Localização não encontrada");
        toast.error("Localização não encontrada. Tente uma busca mais específica.");
      }
    } catch (error) {
      console.error("Erro na geocodificação:", error);
      setSearchError("Erro ao buscar localização");
      toast.error("Erro ao buscar localização. Por favor, tente novamente.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Função para lidar com a busca manual
  const handleSearch = () => {
    if (!searchValue.trim()) return;
    geocodeAddressAndUpdateMap(searchValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    setSearchError(null);
    
    // Clear the autocomplete input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <Wrapper
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={["places"]}
    >
      <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
        <div className="relative mb-6">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer" 
            size={18} 
            onClick={handleSearch}
          />
          <div className="pl-10 pr-10 relative">
            {/* Using native HTML input instead of the ShadCN UI Input component */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por nome, endereço, CEP ou localidade..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>
          {searchValue && (
            <X 
              className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              size={16}
              onClick={clearSearch}
            />
          )}
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-iparty" />
          )}
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
