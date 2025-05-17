import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { toast } from "sonner";
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

type LocationSuggestion = {
  description: string;
  placeId: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
};

const Map = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const navigate = useNavigate();
  const autoCompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.places &&
      !autoCompleteServiceRef.current
    ) {
      autoCompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

      // Cria um elemento temporário para o serviço de Places
      const placesDiv = document.createElement('div');
      placesDiv.style.display = 'none';
      document.body.appendChild(placesDiv);
      
      // Mesmo que o mapa ainda não tenha carregado, o placesService pode ser usado com qualquer div
      placesServiceRef.current = new window.google.maps.places.PlacesService(placesDiv);
    }
  }, []);

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredSpaces(spaces);
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      const lowercaseSearch = searchValue.toLowerCase();
      const filtered = spaces.filter(space => 
        space.name.toLowerCase().includes(lowercaseSearch) || 
        `${space.address}, ${space.number} - ${space.state}`.toLowerCase().includes(lowercaseSearch) ||
        (space.zipCode && space.zipCode.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredSpaces(filtered);
      
      // Debounce the API call for location suggestions
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        if (searchValue.trim().length >= 2) {
          fetchLocationSuggestions(searchValue);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300);
    }
  }, [searchValue, spaces]);

  const fetchLocationSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    
    try {
      // Verifica se o serviço AutocompleteService está disponível
      if (autoCompleteServiceRef.current) {
        autoCompleteServiceRef.current.getPlacePredictions({
          input: query,
          componentRestrictions: { country: 'br' }, // Restringe para Brasil
          types: ['geocode', 'establishment', 'address'],
          language: 'pt-BR'
        }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            const locationSuggestions: LocationSuggestion[] = predictions.map(prediction => ({
              description: prediction.description,
              placeId: prediction.place_id,
              structuredFormatting: {
                mainText: prediction.structured_formatting?.main_text || prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text || ""
              }
            }));
            
            setSuggestions(locationSuggestions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            // Mostra o dropdown vazio apenas se houver texto de busca
            setShowSuggestions(!!query.trim());
          }
          setSearchLoading(false);
        });
      } else {
        // Fallback para o método de geocoding se o AutocompleteService não estiver disponível
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=br&key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw`
        );
        
        const data = await response.json();
        
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const locationSuggestions: LocationSuggestion[] = data.results.map((result: any) => ({
            description: result.formatted_address,
            placeId: result.place_id || "",
            structuredFormatting: {
              mainText: result.formatted_address.split(',')[0] || result.formatted_address,
              secondaryText: result.formatted_address.split(',').slice(1).join(',') || ""
            }
          }));
          
          setSuggestions(locationSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          // Mostra o dropdown vazio apenas se houver texto de busca
          setShowSuggestions(!!query.trim());
          
          if (data.status === "ZERO_RESULTS") {
            setSearchError("Nenhuma localização encontrada para esta busca");
          }
        }
        setSearchLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
      setSuggestions([]);
      setSearchLoading(false);
      toast.error("Erro ao buscar sugestões de localização. Por favor, tente novamente.");
    }
  };

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

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setSearchLoading(true);
    setSearchError(null);
    setShowSuggestions(false);
    
    try {
      // Primeiro tenta com PlacesService se disponível
      if (placesServiceRef.current && suggestions.length > 0) {
        const placeId = suggestions[0].placeId;
        placesServiceRef.current.getDetails({
          placeId: placeId,
          fields: ['geometry', 'formatted_address', 'name']
        }, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            setMapCenter({ lat, lng });
            
            // Se o mapa já foi carregado, ajusta a visualização para a nova localização
            if (mapRef.current) {
              mapRef.current.panTo({ lat, lng });
              mapRef.current.setZoom(14); // Ajusta para um nível de zoom apropriado
            }
            
            toast.success("Localização encontrada!");
          } else {
            // Fallback para geocodificação se o PlacesService falhar
            geocodeAddressAndUpdateMap(searchValue);
          }
          setSearchLoading(false);
        });
      } else {
        // Usa geocodificação se o PlacesService não estiver disponível
        geocodeAddressAndUpdateMap(searchValue);
      }
    } catch (error) {
      console.error("Erro na pesquisa de localização:", error);
      setSearchError("Erro ao buscar localização");
      toast.error("Erro ao buscar localização. Por favor, tente novamente.");
      setSearchLoading(false);
    }
  };

  const geocodeAddressAndUpdateMap = async (address: string) => {
    try {
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

  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      // Usar a API de Geocoding do Google com a API key do config
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        return {
          lat: location.lat,
          lng: location.lng,
          locationName: result.formatted_address
        };
      }
      
      return null;
    } catch (error) {
      console.error("Erro na geocodificação:", error);
      return null;
    }
  };

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    setSearchValue(suggestion.description);
    setShowSuggestions(false);

    // Se tivermos o PlacesService disponível, use-o para obter os detalhes do local
    if (placesServiceRef.current) {
      setSearchLoading(true);
      placesServiceRef.current.getDetails({
        placeId: suggestion.placeId,
        fields: ['geometry', 'formatted_address', 'name']
      }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          setMapCenter({ lat, lng });
          
          if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(14);
          }
          
          toast.success("Localização encontrada!");
        } else {
          // Se falhar, use geocodificação como fallback
          geocodeAddressAndUpdateMap(suggestion.description);
        }
        setSearchLoading(false);
      });
    } else {
      // Geocode a sugestão selecionada para obter suas coordenadas
      setSearchLoading(true);
      geocodeAddressAndUpdateMap(suggestion.description);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    setShowSuggestions(false);
    setSearchError(null);
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
      <div className="relative mb-6">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer" 
          size={18} 
          onClick={handleSearch}
        />
        <Input 
          placeholder="Buscar por nome, endereço, CEP ou localidade..." 
          className="pl-10 pr-10"
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            if (e.target.value.length >= 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onKeyDown={handleKeyPress}
          onFocus={() => {
            if (searchValue.trim().length >= 2) {
              setShowSuggestions(true);
            }
          }}
        />
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
        
        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border">
            <Command className="rounded-md border shadow-md">
              <CommandList>
                {suggestions.length > 0 ? (
                  <CommandGroup heading="Sugestões de localização">
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={`${suggestion.placeId || index}-${index}`}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestion.structuredFormatting.mainText}</span>
                          <span className="text-sm text-muted-foreground">{suggestion.structuredFormatting.secondaryText}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>
                    {searchLoading 
                      ? "Buscando sugestões..." 
                      : searchValue.length < 2 
                        ? "Digite pelo menos 2 caracteres" 
                        : "Nenhuma sugestão encontrada"}
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          </div>
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
  );
};

export default Map;
