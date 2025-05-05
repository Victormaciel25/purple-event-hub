
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

const Map = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
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
    // Navigate to the event space details page with the correct route
    navigate(`/event-space/${spaceId}`);
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar por nome, endereço ou CEP..." 
          className="pl-10"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
        <LocationMap 
          onLocationSelected={() => {}} 
          viewOnly={true}
          spaces={filteredSpaces}
          onSpaceClick={handleSpaceClick}
          isLoading={loading}
        />
      </div>
    </div>
  );
};

export default Map;
