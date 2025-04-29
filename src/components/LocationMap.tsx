
import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface LocationMapProps {
  onLocationSelected?: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number } | null;
}

const LocationMap = ({ onLocationSelected, initialLocation }: LocationMapProps) => {
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
    initialLocation || null
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

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
        }
      );
    } else {
      console.error("Geolocalização não é suportada pelo seu navegador");
    }
  };

  // Simular clique no mapa
  const handleMapClick = (event: React.MouseEvent) => {
    const mapElement = event.currentTarget as HTMLDivElement;
    const rect = mapElement.getBoundingClientRect();
    
    // Calcular posição relativa (simulação)
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Simular conversão para coordenadas (em uma implementação real, isto seria feito pela API do mapa)
    // Aqui estamos apenas simulando valores baseados na posição do clique
    const simulatedLat = position ? position.lat + (y - rect.height/2) / 5000 : 0;
    const simulatedLng = position ? position.lng + (x - rect.width/2) / 5000 : 0;
    
    const newPosition = { lat: simulatedLat, lng: simulatedLng };
    setPosition(newPosition);
    
    if (onLocationSelected) {
      onLocationSelected(newPosition.lat, newPosition.lng);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-gray-200 rounded-lg cursor-crosshair"
      onClick={hasRequestedLocation ? handleMapClick : undefined}
    >
      <div className="absolute inset-0 opacity-30 bg-gradient-radial from-transparent to-black/20 rounded-lg" />
      
      {position && (
        <div className="absolute" style={{ 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)' 
        }}>
          <div className="relative">
            <MapPin size={40} className="text-red-500" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </div>
        </div>
      )}
      
      {!hasRequestedLocation ? (
        <div className="absolute inset-0 flex items-center justify-center">
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
      ) : !position ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs text-center z-10">
            <p className="text-sm">
              Obtendo sua localização...
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow-lg z-10 text-sm text-center">
          <p>Clique no mapa para ajustar a posição exata do seu espaço</p>
          <p className="text-xs text-muted-foreground mt-1">
            Coordenadas: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
