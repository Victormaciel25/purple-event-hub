import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const mapRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredSpaces(spaces);
    } else {
      const lowercaseSearch = searchValue.toLowerCase();
      const filtered = spaces.filter(space => 
        space.name.toLowerCase().includes(lowercaseSearch) || 
        `${space.address}, ${space.number} - ${space.state}`.toLowerCase().includes(lowercaseSearch) ||
        (space.zipCode && space.zipCode.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredSpaces(filtered);
    }
  }, [searchValue, spaces]);

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
    
    try {
      const geocodingResult = await geocodeAddress(searchValue);
      
      if (geocodingResult) {
        setMapCenter({ lat: geocodingResult.lat, lng: geocodingResult.lng });
        
        // Se o mapa já foi carregado, ajusta a visualização para a nova localização
        if (mapRef.current) {
          mapRef.current.panTo({ lat: geocodingResult.lat, lng: geocodingResult.lng });
          mapRef.current.setZoom(14); // Ajusta para um nível de zoom apropriado
          
          // Importante: Não estamos modificando keepPinsVisible na busca
          // A visibilidade dos pins será controlada pelo zoom atual, conforme a regra
        }
        
        // Limpar o input de pesquisa após a busca bem-sucedida
        setSearchValue("");
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
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyPress}
        />
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
          keepPinsVisible={false} // Mudado para false para permitir que a lógica de zoom funcione
        />
      </div>
    </div>
  );
};

export default Map;
