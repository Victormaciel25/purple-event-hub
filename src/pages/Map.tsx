
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

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

type SearchSuggestion = {
  description: string;
  placeId?: string;
  mainText?: string;
  secondaryText?: string;
};

const Map = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const mapRef = useRef<any>(null);
  const navigate = useNavigate();
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredSpaces(spaces);
      setSuggestions([]);
      return;
    }
    
    const lowercaseSearch = searchValue.toLowerCase();
    
    // Filter spaces based on search - add null check to ensure spaces is defined
    const filtered = spaces ? spaces.filter(space => 
      space.name.toLowerCase().includes(lowercaseSearch) || 
      `${space.address}, ${space.number} - ${space.state}`.toLowerCase().includes(lowercaseSearch) ||
      (space.zipCode && space.zipCode.toLowerCase().includes(lowercaseSearch))
    ) : [];
    
    setFilteredSpaces(filtered);
    
    // Set up debounced geocoding search for location suggestions
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      if (searchValue.trim().length > 2) {
        fetchLocationSuggestions(searchValue);
      } else {
        setSuggestions([]);
      }
    }, 300);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchValue, spaces]);

  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      
      // Call the Google Maps Places API to get suggestions
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const newSuggestions = data.results.map((result: any) => ({
          description: result.formatted_address,
          placeId: result.place_id,
          // Extract main components (locality, administrative_area, country)
          mainText: result.address_components.find((c: any) => 
            c.types.includes("locality") || 
            c.types.includes("administrative_area_level_1")
          )?.long_name || result.formatted_address.split(',')[0],
          secondaryText: result.formatted_address
        }));
        
        setSuggestions(newSuggestions);
        setPopoverOpen(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    } finally {
      setSearchLoading(false);
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
          (spacesData || []).map(async (space) => {
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
      // Initialize with empty arrays to prevent undefined errors
      setSpaces([]);
      setFilteredSpaces([]);
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
    setPopoverOpen(false);
    
    try {
      const geocodingResult = await geocodeAddress(searchValue);
      
      if (geocodingResult) {
        setMapCenter({ lat: geocodingResult.lat, lng: geocodingResult.lng });
        
        // If the map already loaded, adjust the view to the new location
        if (mapRef.current) {
          mapRef.current.panTo({ lat: geocodingResult.lat, lng: geocodingResult.lng });
          mapRef.current.setZoom(14);
        }
      } else {
        setSearchError("Localização não encontrada");
      }
    } catch (error) {
      console.error("Erro na pesquisa de localização:", error);
      setSearchError("Erro ao buscar localização");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSuggestionSelect = async (suggestion: SearchSuggestion) => {
    setSearchValue(suggestion.description);
    setPopoverOpen(false);
    
    try {
      setSearchLoading(true);
      setSearchError(null);
      
      const geocodingResult = await geocodeAddress(suggestion.description);
      
      if (geocodingResult) {
        setMapCenter({ lat: geocodingResult.lat, lng: geocodingResult.lng });
        
        if (mapRef.current) {
          mapRef.current.panTo({ lat: geocodingResult.lat, lng: geocodingResult.lng });
          mapRef.current.setZoom(14);
        }
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
      setSearchError("Erro ao selecionar localização");
    } finally {
      setSearchLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      // Usar a API de Geocoding do Google
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw`
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    setSuggestions([]);
    setPopoverOpen(false);
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
      <div className="relative mb-6">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer" 
          size={18} 
          onClick={handleSearch}
        />
        
        <Popover open={popoverOpen && suggestions.length > 0} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input 
                placeholder="Buscar por nome, endereço, CEP ou localidade..." 
                className="pl-10 pr-10"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              {searchValue && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
            <Command>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {suggestions && suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={suggestion.placeId || index}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="cursor-pointer py-2 px-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{suggestion.mainText}</span>
                      <span className="text-sm text-muted-foreground truncate">{suggestion.secondaryText}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {suggestions && suggestions.length === 0 && searchValue.length >= 3 && (
                <CommandEmpty className="py-2 px-2 text-sm text-muted-foreground">
                  Nenhuma sugestão encontrada
                </CommandEmpty>
              )}
            </Command>
          </PopoverContent>
        </Popover>
        
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
          spaces={filteredSpaces || []}
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
