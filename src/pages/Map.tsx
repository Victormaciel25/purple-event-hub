import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationMap from "@/components/LocationMap";
import AddressAutoComplete from "@/components/AddressAutoComplete";
import { supabase } from "@/integrations/supabase/client";
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

const Map: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const navigate = useNavigate();

  // 1) Pega localização atual do usuário no mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setSearchError("Geolocalização não suportada neste navegador");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const userLoc = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(userLoc);
      },
      (err) => {
        console.warn("Erro ao obter localização:", err);
        setSearchError("Não foi possível obter sua localização");
      }
    );
  }, []);

  // 2) Sempre que mapCenter muda, centraliza o mapa
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      mapRef.current.panTo(mapCenter);
      mapRef.current.setZoom(14);
    }
  }, [mapCenter]);

  // Carrega espaços do Supabase
  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const { data: spacesData, error } = await supabase
        .from("spaces")
        .select("id, name, address, number, state, latitude, longitude, zip_code, space_photos(storage_path)")
        .eq("status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) throw error;

      const spacesWithImages = await Promise.all(
        (spacesData || []).map(async (space) => {
          let imageUrl: string | undefined;
          if (space.space_photos?.length) {
            const { data: urlData } = await supabase
              .storage.from("spaces")
              .createSignedUrl(space.space_photos[0].storage_path, 3600);
            if (urlData) imageUrl = urlData.signedUrl;
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
        })
      );

      setSpaces(spacesWithImages);
      setFilteredSpaces(spacesWithImages);
    } catch (error) {
      console.error("Erro ao buscar espaços:", error);
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
    setMapCenter({ lat: loc.lat, lng: loc.lng });
    setSearchError(null);
    toast.success("Localização encontrada!");
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
          {loading ? (
            <Loader2 className="animate-spin h-8 w-8 text-iparty" />
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
