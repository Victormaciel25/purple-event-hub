
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
  keepPinsVisible?: boolean; // Controla se os pinos ficam visíveis independente do zoom
}

// Exemplo de style que esconde todos os POIs (incluindo businesses)
const hidePOIsStyle = [
  {
    featureType: "poi",
    elementType: "all",
    stylers: [
      { visibility: "off" }
    ]
  }
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: -23.5505,  // São Paulo, Brazil
  lng: -46.6333
};

// Limite de zoom para mostrar/ocultar pinos
const PIN_VISIBILITY_ZOOM_THRESHOLD = 10.0;

const GOOGLE_MAPS_API_KEY = "AIzaSyDmquKmV6OtKkJCG2eEe4NIPE8MzcrkUyw";

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
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
    initialLocation || null
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(viewOnly);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [showPins, setShowPins] = useState<boolean>(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Atualiza o estado de visibilidade dos pinos quando o zoom mudar
  useEffect(() => {
    if (keepPinsVisible) {
      // Se keepPinsVisible for true, sempre mostrar os pinos
      setShowPins(true);
    } else {
      // Ocultar pinos quando zoom for <= PIN_VISIBILITY_ZOOM_THRESHOLD
      const shouldShowPins = currentZoom > PIN_VISIBILITY_ZOOM_THRESHOLD;
      console.log(`Zoom: ${currentZoom}, Threshold: ${PIN_VISIBILITY_ZOOM_THRESHOLD}, Show pins: ${shouldShowPins}`);
      setShowPins(shouldShowPins);
    }
  }, [currentZoom, keepPinsVisible]);

  // Atualiza a posição quando initialLocation muda
  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

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
          // Usar posição padrão em caso de erro
          setPosition(defaultCenter);
        }
      );
    } else {
      console.error("Geolocalização não é suportada pelo seu navegador");
      setPosition(defaultCenter);
    }
  };

  // Carrega posição inicial automaticamente no modo viewOnly
  useEffect(() => {
    if (viewOnly && !position) {
      requestUserLocation();
    }
  }, [viewOnly, position]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    // Só permite posicionar pino se não estiver no modo viewOnly
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
    // Só permite posicionar pino se não estiver no modo viewOnly
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

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    // Define o valor inicial do zoom
    const initialZoom = map.getZoom() || 12;
    setCurrentZoom(initialZoom);
    
    // Adiciona listener para mudanças de zoom
    map.addListener('zoom_changed', () => {
      const newZoom = map.getZoom() || 12;
      setCurrentZoom(newZoom);
      console.log("Zoom changed to:", newZoom, "Pins visible:", newZoom > PIN_VISIBILITY_ZOOM_THRESHOLD);
    });
    
    // Chama o callback onMapLoad se fornecido
    if (onMapLoad) {
      onMapLoad(map);
    }
  };

  // Efeito para centralizar o mapa no initialLocation quando ele muda
  useEffect(() => {
    if (initialLocation && mapRef.current) {
      mapRef.current.panTo({ lat: initialLocation.lat, lng: initialLocation.lng });
      mapRef.current.setZoom(15);
    }
  }, [initialLocation]);

  // Efeito para ajustar a visualização para incluir todos os marcadores se houver espaços
  useEffect(() => {
    if (spaces && spaces.length > 0 && mapRef.current && !initialLocation) {
      const bounds = new google.maps.LatLngBounds();
      spaces.forEach(space => {
        bounds.extend(new google.maps.LatLng(space.latitude, space.longitude));
      });
      mapRef.current.fitBounds(bounds);
      
      // Não aproxima demais em áreas pequenas
      if (mapRef.current.getZoom() > 15) {
        mapRef.current.setZoom(15);
      }
    }
  }, [spaces, isLoaded, initialLocation]);

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
              zoomControl: true,
              styles: hidePOIsStyle, // Aplicando o estilo para esconder POIs
              gestureHandling: 'greedy' // Permite navegação com um dedo no mobile
            }}
            onLoad={handleMapLoad}
          >
            {position && !viewOnly && (
              <Marker
                position={position}
                draggable={!viewOnly}
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
            
            {/* Renderize os marcadores de espaço APENAS se showPins for true */}
            {showPins && spaces.map((space) => (
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
            
            {/* Mostra a janela de informações para o espaço selecionado */}
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
                  className="space-info-window max-w-[300px] cursor-pointer"
                  onClick={handleSpaceClick}
                >
                  <div className="bg-white rounded-lg overflow-hidden shadow-md">
                    {selectedSpace.imageUrl && (
                      <div className="h-40 overflow-hidden">
                        <img 
                          src={selectedSpace.imageUrl} 
                          alt={selectedSpace.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <div className="p-2">
                      <h3 className="font-bold text-base text-iparty">{selectedSpace.name}</h3>
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
          </GoogleMap>
          
          {/* Overlay de carregamento */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200/70 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow">
                <Loader2 className="h-5 w-5 animate-spin text-iparty" />
                <span>Carregando espaços...</span>
              </div>
            </div>
          )}
          
          {/* Texto de posição */}
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
