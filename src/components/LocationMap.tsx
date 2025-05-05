
import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

interface Space {
  id: string;
  name: string;
  address: string;
  number: string;
  state: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

interface LocationMapProps {
  onLocationSelected?: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number } | null;
  viewOnly?: boolean;
  spaces?: Space[];
  onSpaceClick?: (spaceId: string) => void;
  isLoading?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: -23.5505,  // São Paulo, Brazil
  lng: -46.6333
};

const GOOGLE_MAPS_API_KEY = "AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw";

const LocationMap = ({ 
  onLocationSelected, 
  initialLocation, 
  viewOnly = false, 
  spaces = [],
  onSpaceClick,
  isLoading = false
}: LocationMapProps) => {
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
    initialLocation || null
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(viewOnly);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const requestUserLocation = () => {
    setHasRequestedLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setPosition(newPosition);
          if (onLocationSelected && !viewOnly) {
            onLocationSelected(newPosition.lat, newPosition.lng);
          }
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          // Use default position on error
          setPosition(defaultCenter);
        }
      );
    } else {
      console.error("Geolocalização não é suportada pelo seu navegador");
      setPosition(defaultCenter);
    }
  };

  // Load initial position automatically when in viewOnly mode
  useEffect(() => {
    if (viewOnly && !position) {
      requestUserLocation();
    }
  }, [viewOnly, position]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    // Only allow pin positioning if not in viewOnly mode
    if (viewOnly || !event.latLng) return;
    
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    setPosition(newPosition);
    
    if (onLocationSelected) {
      onLocationSelected(newPosition.lat, newPosition.lng);
    }
  };

  const onMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
    // Only allow pin positioning if not in viewOnly mode
    if (viewOnly || !event.latLng) return;
    
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    setPosition(newPosition);
    
    if (onLocationSelected) {
      onLocationSelected(newPosition.lat, newPosition.lng);
    }
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  // Effect to center the map on initialLocation when it changes
  useEffect(() => {
    if (initialLocation && mapRef.current) {
      mapRef.current.panTo({ lat: initialLocation.lat, lng: initialLocation.lng });
      mapRef.current.setZoom(15);
    }
  }, [initialLocation]);

  // Effect to fit all markers in view if there are spaces
  useEffect(() => {
    if (spaces && spaces.length > 0 && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      spaces.forEach(space => {
        bounds.extend(new google.maps.LatLng(space.latitude, space.longitude));
      });
      mapRef.current.fitBounds(bounds);
      
      // Don't zoom in too much on small areas
      if (mapRef.current.getZoom() > 15) {
        mapRef.current.setZoom(15);
      }
    }
  }, [spaces, isLoaded]);

  const handleMarkerClick = (space: Space) => {
    setSelectedSpace(space);
  };

  const handleInfoWindowClose = () => {
    setSelectedSpace(null);
  };

  const handleSpaceClick = () => {
    if (selectedSpace && onSpaceClick) {
      onSpaceClick(selectedSpace.id);
    }
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg">
        <div className="bg-white p-4 rounded-lg shadow-lg text-center">
          <p className="text-red-600">Erro ao carregar o mapa. Por favor, tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {!hasRequestedLocation ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs text-center z-10">
            <p className="text-sm mb-4">
              Para selecionar a localização do seu espaço, precisamos do acesso à sua localização atual.
            </p>
            <button 
              className="bg-iparty hover:bg-iparty-dark text-white px-4 py-2 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                requestUserLocation();
              }}
            >
              Permitir localização
            </button>
          </div>
        </div>
      ) : !isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <p>Carregando mapa...</p>
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={position || defaultCenter}
            zoom={15}
            onClick={handleMapClick}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true
            }}
            onLoad={onMapLoad}
          >
            {position && !viewOnly && (
              <Marker
                position={position}
                draggable={!viewOnly} // Only allow dragging when not in viewOnly mode
                onDragEnd={onMarkerDragEnd}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#FF4136",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#FFFFFF",
                }}
              />
            )}
            
            {/* Render all space markers if provided */}
            {spaces.map((space) => (
              <Marker
                key={space.id}
                position={{ lat: space.latitude, lng: space.longitude }}
                onClick={() => handleMarkerClick(space)}
                icon={{
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 6,
                  fillColor: "#7C3AED", // Cor do iParty (roxo)
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#FFFFFF",
                }}
              />
            ))}
            
            {/* Show info window for selected space */}
            {selectedSpace && (
              <InfoWindow
                position={{ lat: selectedSpace.latitude, lng: selectedSpace.longitude }}
                onCloseClick={handleInfoWindowClose}
              >
                <div 
                  className="space-info-window max-w-[260px]"
                  onClick={handleSpaceClick}
                  style={{ cursor: 'pointer' }}
                >
                  {selectedSpace.imageUrl && (
                    <div className="mb-2 h-32 overflow-hidden rounded">
                      <img 
                        src={selectedSpace.imageUrl} 
                        alt={selectedSpace.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                  <h3 className="font-bold text-base">{selectedSpace.name}</h3>
                  <p className="text-sm text-gray-600 truncate">
                    {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Clique para ver detalhes</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
          
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200/70 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow">
                <Loader2 className="h-5 w-5 animate-spin text-iparty" />
                <span>Carregando espaços...</span>
              </div>
            </div>
          )}
          
          {position && !viewOnly && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow-lg z-10 text-sm text-center">
              <p>Clique ou arraste o marcador para ajustar a posição exata do seu espaço</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coordenadas: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocationMap;
