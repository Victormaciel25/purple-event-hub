
import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";
import OptimizedImage from "./OptimizedImage";

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
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333
};

// Changed the threshold to 12 as per the requirement
const PIN_VISIBILITY_ZOOM_THRESHOLD = 12.0;
// Define libraries correctly according to @react-google-maps/api types
const libraries: ["places"] = ["places"];

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
  const [showContainer, setShowContainer] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // Track the moved spaces to prevent duplicate movements
  const [movedSpaces, setMovedSpaces] = useState<Record<string, boolean>>({});
  // Track the offset positions for each space
  const [offsetPositions, setOffsetPositions] = useState<Record<string, {lat: number, lng: number}>>({});
  
  // Add the useJsApiLoader hook to load the Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
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
    setShowContainer(false);
    setIsAnimating(true);
    
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      const targetPosition = { lat: space.latitude, lng: space.longitude };
      
      // Check if we're already very close to the target position (within ~10 meters)
      const isAlreadyAtPosition = currentCenter && 
        Math.abs(currentCenter.lat() - targetPosition.lat) < 0.0001 && 
        Math.abs(currentCenter.lng() - targetPosition.lng) < 0.0001;

      // If we already have an offset position for this space, use it
      if (offsetPositions[space.id]) {
        const targetOffsetPosition = offsetPositions[space.id];
        const isAlreadyAtOffsetPosition = currentCenter &&
          Math.abs(currentCenter.lat() - targetOffsetPosition.lat) < 0.0001 &&
          Math.abs(currentCenter.lng() - targetOffsetPosition.lng) < 0.0001;

        if (isAlreadyAtOffsetPosition) {
          // Already at offset position, show container immediately
          setShowContainer(true);
          setIsAnimating(false);
        } else {
          // Move to offset position
          mapRef.current.panTo(targetOffsetPosition);
          // Show container after pan animation
          setTimeout(() => {
            setShowContainer(true);
            setIsAnimating(false);
          }, 750);
        }
      } else if (isAlreadyAtPosition) {
        // Already at marker position, calculate offset and show immediately
        const projection = mapRef.current.getProjection();
        if (projection) {
          const point = projection.fromLatLngToPoint(new google.maps.LatLng(targetPosition.lat, targetPosition.lng));
          point.y -= 220 / Math.pow(2, mapRef.current.getZoom() || 0);
          const newLatLng = projection.fromPointToLatLng(point);
          
          // Store the offset position for future use
          setOffsetPositions(prev => ({
            ...prev,
            [space.id]: {lat: newLatLng.lat(), lng: newLatLng.lng()}
          }));
          
          // Move to the offset position
          mapRef.current.panTo(newLatLng);
          
          // Mark this space as having been moved
          setMovedSpaces(prev => ({
            ...prev,
            [space.id]: true
          }));
          
          // Show container after a shorter delay since we're already close
          setTimeout(() => {
            setShowContainer(true);
            setIsAnimating(false);
          }, 200);
        }
      } else {
        // First center on the marker
        mapRef.current.panTo(targetPosition);
        
        // Then calculate and apply the offset position with additional 40px
        setTimeout(() => {
          if (mapRef.current) {
            const projection = mapRef.current.getProjection();
            if (projection) {
              const point = projection.fromLatLngToPoint(new google.maps.LatLng(targetPosition.lat, targetPosition.lng));
              // Increased offset from 130px to 170px (130 + 40)
              point.y -= 220 / Math.pow(2, mapRef.current.getZoom() || 0);
              const newLatLng = projection.fromPointToLatLng(point);
              
              // Store the offset position for future use
              setOffsetPositions(prev => ({
                ...prev,
                [space.id]: {lat: newLatLng.lat(), lng: newLatLng.lng()}
              }));
              
              // Move to the offset position
              mapRef.current.panTo(newLatLng);
              
              // Mark this space as having been moved
              setMovedSpaces(prev => ({
                ...prev,
                [space.id]: true
              }));
              
              // Show container after pan animation completes
              setTimeout(() => {
                setShowContainer(true);
                setIsAnimating(false);
              }, 750);
            }
          }
        }, 50);
      }
    }
  };

  const handleInfoWindowClose = () => {
    setSelectedSpace(null);
    setShowContainer(false);
    setIsAnimating(false);
  };

  const handleSpaceClick = () => {
    if (selectedSpace && onSpaceClick) {
      onSpaceClick(selectedSpace.id);
    }
  };

  if (loadError) {
    return <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg shadow">Erro ao carregar o mapa</div>;
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md">
      {!isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl animate-pulse">
          <div className="text-gray-600 font-medium">Carregando mapa...</div>
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

          {selectedSpace && showContainer && !isAnimating && (
            <OverlayView
              position={{ lat: selectedSpace.latitude, lng: selectedSpace.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div 
                className="cursor-pointer overflow-hidden rounded-2xl shadow-2xl bg-white transition-all duration-300 hover:shadow-3xl border border-gray-100 backdrop-blur-sm"
                onClick={handleSpaceClick}
                style={{ 
                  width: 300, 
                  transform: 'translate(-50%, -100%) translateY(-15px)',
                  boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 8px 25px -8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/50">
                  <h3 className="font-bold text-lg text-gray-900 truncate pr-3 leading-tight">
                    {selectedSpace.name}
                  </h3>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleInfoWindowClose(); 
                    }} 
                    className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 rounded-full hover:bg-gray-100 flex-shrink-0 group"
                    aria-label="Fechar"
                  >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                {selectedSpace.imageUrl && (
                  <div className="h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
                    <OptimizedImage 
                      src={selectedSpace.imageUrl} 
                      alt={selectedSpace.name} 
                      className="w-full h-full transform hover:scale-105 transition-transform duration-500"
                      loadingClassName="animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 h-full w-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                  </div>
                )}

                <div className="p-5 bg-gradient-to-b from-white to-gray-50/30">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}
                    </p>
                    {selectedSpace.zipCode && (
                      <p className="text-sm text-gray-500 font-medium">
                        CEP: {selectedSpace.zipCode}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <div className="group flex items-center gap-2 bg-gradient-to-r from-iparty/10 to-iparty/5 text-iparty px-4 py-2.5 rounded-xl font-semibold text-sm hover:from-iparty/20 hover:to-iparty/10 transition-all duration-300 shadow-sm hover:shadow-md border border-iparty/20">
                      <span>Ver detalhes</span>
                      <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                    </div>
                  </div>
                </div>
              </div>
            </OverlayView>
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
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-iparty" />
          <span className="text-sm font-medium text-gray-700">Carregando espaços...</span>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
