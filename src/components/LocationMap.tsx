
import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";

interface Space {
  id: string;
  name: string;
  address: string;
  number: string;
  state: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  zipCode?: string;
}

interface LocationMapProps {
  onLocationSelected?: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number } | null;
  viewOnly?: boolean;
  spaces?: Space[];
  onSpaceClick?: (spaceId: string) => void;
  isLoading?: boolean;
  onMapLoad?: (map: google.maps.Map) => void;
  keepPinsVisible?: boolean;
}

const hidePOIsStyle = [
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  }
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333
};

// Changed the threshold to 12 as per the requirement
const PIN_VISIBILITY_ZOOM_THRESHOLD = 12.0;
const libraries = ["places"];

const LocationMap = ({
  onLocationSelected,
  initialLocation,
  viewOnly = false,
  spaces = [],
  onSpaceClick,
  isLoading = false,
  onMapLoad,
  keepPinsVisible = false
}: LocationMapProps) => {
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(initialLocation || null);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [showPins, setShowPins] = useState<boolean>(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries as any
  });

  // Changed the condition to hide pins when zoom is less than threshold
  useEffect(() => {
    setShowPins(keepPinsVisible || currentZoom >= PIN_VISIBILITY_ZOOM_THRESHOLD);
  }, [currentZoom, keepPinsVisible]);

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (spaces.length > 0 && mapRef.current && !initialLocation) {
      const bounds = new google.maps.LatLngBounds();
      spaces.forEach(space => {
        if (typeof space.latitude === 'number' && typeof space.longitude === 'number') {
          bounds.extend({ lat: space.latitude, lng: space.longitude });
        }
      });
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds);
        if (mapRef.current.getZoom() > 15) {
          mapRef.current.setZoom(15);
        }
      }
    }
  }, [spaces, isLoaded, initialLocation]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setCurrentZoom(map.getZoom() || 12);
    map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() || 12);
    });
    if (onMapLoad) onMapLoad(map);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (viewOnly || !event.latLng) return;
    const newPosition = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setPosition(newPosition);
    onLocationSelected?.(newPosition.lat, newPosition.lng);
  };

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
    return <div className="text-center text-red-500">Erro ao carregar o mapa</div>;
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {!isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <p>Carregando mapa...</p>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={position || defaultCenter}
          zoom={15}
          onClick={handleMapClick}
          options={{
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            zoomControl: true,
            styles: hidePOIsStyle,
            gestureHandling: 'greedy'
          }}
          onLoad={handleMapLoad}
        >
          {/* Espaços */}
          {showPins && spaces.map(space => (
            <Marker
              key={space.id}
              position={{ lat: space.latitude, lng: space.longitude }}
              onClick={() => handleMarkerClick(space)}
              animation={google.maps.Animation.DROP}
              icon={{
                url: `data:image/svg+xml;utf8,${encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 24 24" fill="#9b87f5" stroke="#6e61b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>'
                )}`,
                scaledSize: new google.maps.Size(40, 46),
                anchor: new google.maps.Point(20, 46),
              }}
            />
          ))}

          {selectedSpace && (
            <InfoWindow
              position={{ lat: selectedSpace.latitude, lng: selectedSpace.longitude }}
              onCloseClick={handleInfoWindowClose}
              options={{
                pixelOffset: new google.maps.Size(0, -46),
                maxWidth: 300
              }}
            >
              <div 
                className="cursor-pointer"
                onClick={handleSpaceClick}
                style={{ padding: 0, margin: 0 }}
              >
                <div className="overflow-hidden rounded-lg shadow">
                  <div className="p-2 bg-white flex justify-between items-center">
                    <h3 className="font-bold text-base text-iparty">{selectedSpace.name}</h3>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleInfoWindowClose(); 
                      }} 
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {selectedSpace.imageUrl && (
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={selectedSpace.imageUrl} 
                        alt={selectedSpace.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                  <div className="p-2 bg-white">
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}
                    </p>
                    {selectedSpace.zipCode && (
                      <p className="text-sm text-gray-600">
                        CEP: {selectedSpace.zipCode}
                      </p>
                    )}
                    <div className="mt-1 flex justify-end">
                      <div className="text-xs bg-iparty/10 text-iparty px-2 py-1 rounded-full">
                        Ver detalhes →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Marcador da posição manual */}
          {position && !viewOnly && (
            <Marker
              position={position}
              draggable={!viewOnly}
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (lat && lng) {
                  setPosition({ lat, lng });
                  onLocationSelected?.(lat, lng);
                }
              }}
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
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-iparty" />
          <span className="ml-2">Carregando espaços...</span>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
