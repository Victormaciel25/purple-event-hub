import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/config/app-config";
import { useIsMobile } from "@/hooks/use-mobile";
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
  isPromoted?: boolean;
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

const PIN_VISIBILITY_ZOOM_THRESHOLD = 12.0;
const libraries: ["places"] = ["places"];

// Helper para validar localização
const isValidLocation = (location: { lat: number; lng: number } | null): boolean => {
  if (!location) return false;
  const { lat, lng } = location;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
};

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
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [showPins, setShowPins] = useState<boolean>(true);
  const [showContainer, setShowContainer] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [screenDimensions, setScreenDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const isMobile = useIsMobile();
  
  const [movedSpaces, setMovedSpaces] = useState<Record<string, boolean>>({});
  const [offsetPositions, setOffsetPositions] = useState<Record<string, {lat: number, lng: number}>>({});
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Monitorar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular offset dinâmico baseado no tamanho da tela
  const calculateDynamicOffset = () => {
    // Posicionar o marcador a aproximadamente 20% da altura da tela a partir da parte inferior
    // Baseado na posição da bolinha rosa na imagem
    const viewportHeight = screenDimensions.height;
    const targetPosition = 0.2; // 20% da parte inferior da tela
    
    const pixelOffset = viewportHeight * targetPosition;
    
    console.log('📍 MAP_OFFSET: Viewport height:', viewportHeight, 'Target offset:', pixelOffset, 'Is mobile:', isMobile);
    
    // Ajustar para mobile - usar um offset ligeiramente menor
    return isMobile ? pixelOffset * 0.9 : pixelOffset;
  };

  // VALIDAÇÃO INICIAL DE LOCALIZAÇÃO
  useEffect(() => {
    if (initialLocation) {
      if (isValidLocation(initialLocation)) {
        console.log('🗺️ LOCATION_MAP: Using VALID initial location:', initialLocation);
        setPosition(initialLocation);
      } else {
        console.warn('⚠️ LOCATION_MAP: Initial location is INVALID, using default:', initialLocation);
        setPosition(defaultCenter);
      }
    } else {
      console.log('🗺️ LOCATION_MAP: No initial location, using default center');
      setPosition(defaultCenter);
    }
  }, [initialLocation]);

  useEffect(() => {
    setShowPins(keepPinsVisible || currentZoom >= PIN_VISIBILITY_ZOOM_THRESHOLD);
  }, [currentZoom, keepPinsVisible]);

  useEffect(() => {
    if (spaces.length > 0 && mapRef.current && !isValidLocation(initialLocation)) {
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
    
    if (isValidLocation(newPosition)) {
      setPosition(newPosition);
      onLocationSelected?.(newPosition.lat, newPosition.lng);
    } else {
      console.warn('⚠️ LOCATION_MAP: Invalid position clicked:', newPosition);
    }
  };

  const handleMarkerClick = (space: Space) => {
    setSelectedSpace(space);
    setShowContainer(false);
    setIsAnimating(true);
    
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      const targetPosition = { lat: space.latitude, lng: space.longitude };
      const currentZoom = mapRef.current.getZoom() || 15;
      
      const isAlreadyAtPosition = currentCenter && 
        Math.abs(currentCenter.lat() - targetPosition.lat) < 0.0001 && 
        Math.abs(currentCenter.lng() - targetPosition.lng) < 0.0001;

      if (offsetPositions[space.id]) {
        const targetOffsetPosition = offsetPositions[space.id];
        const isAlreadyAtOffsetPosition = currentCenter &&
          Math.abs(currentCenter.lat() - targetOffsetPosition.lat) < 0.0001 &&
          Math.abs(currentCenter.lng() - targetOffsetPosition.lng) < 0.0001;

        if (isAlreadyAtOffsetPosition) {
          setShowContainer(true);
          setIsAnimating(false);
        } else {
          mapRef.current.panTo(targetOffsetPosition);
          setTimeout(() => {
            setShowContainer(true);
            setIsAnimating(false);
          }, 750);
        }
      } else if (isAlreadyAtPosition) {
        const projection = mapRef.current.getProjection();
        if (projection) {
          const point = projection.fromLatLngToPoint(new google.maps.LatLng(targetPosition.lat, targetPosition.lng));
          // Calcular offset dinâmico baseado no tamanho da tela e zoom
          const dynamicOffset = calculateDynamicOffset();
          console.log('📍 MAP_OFFSET: Dynamic offset calculated:', dynamicOffset, 'Current zoom:', currentZoom);
          point.y -= dynamicOffset / Math.pow(2, currentZoom);
          const newLatLng = projection.fromPointToLatLng(point);
          
          setOffsetPositions(prev => ({
            ...prev,
            [space.id]: {lat: newLatLng.lat(), lng: newLatLng.lng()}
          }));
          
          mapRef.current.panTo(newLatLng);
          
          setMovedSpaces(prev => ({
            ...prev,
            [space.id]: true
          }));
          
          setTimeout(() => {
            setShowContainer(true);
            setIsAnimating(false);
          }, 750);
        }
      } else {
        mapRef.current.panTo(targetPosition);
        
        setTimeout(() => {
          if (mapRef.current) {
            const projection = mapRef.current.getProjection();
            if (projection) {
              const point = projection.fromLatLngToPoint(new google.maps.LatLng(targetPosition.lat, targetPosition.lng));
              // Calcular offset dinâmico baseado no tamanho da tela e zoom
              const dynamicOffset = calculateDynamicOffset();
              console.log('📍 MAP_OFFSET: Dynamic offset calculated:', dynamicOffset, 'Current zoom:', currentZoom);
              point.y -= dynamicOffset / Math.pow(2, currentZoom);
              const newLatLng = projection.fromPointToLatLng(point);
              
              setOffsetPositions(prev => ({
                ...prev,
                [space.id]: {lat: newLatLng.lat(), lng: newLatLng.lng()}
              }));
              
              mapRef.current.panTo(newLatLng);
              
              setMovedSpaces(prev => ({
                ...prev,
                [space.id]: true
              }));
              
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

  // GUARD: Não renderizar se não temos posição válida
  if (!position || !isValidLocation(position)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin h-8 w-8 text-iparty" />
          <span className="text-sm text-gray-600">Obtendo localização...</span>
        </div>
      </div>
    );
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
          center={position}
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
                  space.isPromoted 
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 24 24" fill="#eab308" stroke="#ca8a04" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 24 24" fill="#9b87f5" stroke="#6e61b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>'
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
                  const newPosition = { lat, lng };
                  if (isValidLocation(newPosition)) {
                    setPosition(newPosition);
                    onLocationSelected?.(lat, lng);
                  }
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
