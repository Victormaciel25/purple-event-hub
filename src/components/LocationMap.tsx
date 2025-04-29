
import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

interface LocationMapProps {
  onLocationSelected?: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number } | null;
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

const LocationMap = ({ onLocationSelected, initialLocation }: LocationMapProps) => {
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
    initialLocation || null
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
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
          if (onLocationSelected) {
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

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setPosition(newPosition);
      
      if (onLocationSelected) {
        onLocationSelected(newPosition.lat, newPosition.lng);
      }
    }
  };

  const onMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setPosition(newPosition);
      
      if (onLocationSelected) {
        onLocationSelected(newPosition.lat, newPosition.lng);
      }
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
            {position && (
              <Marker
                position={position}
                draggable={true}
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
          </GoogleMap>
          
          {position && (
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
