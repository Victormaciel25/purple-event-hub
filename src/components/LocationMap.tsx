
import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface LocationMapProps {
  onLocationSelected?: (lat: number, lng: number) => void;
  initialLocation?: { lat: number, lng: number } | null;
}

const LocationMap = ({ onLocationSelected, initialLocation }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
    initialLocation || null
  );
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");

  // Temporary function to request mapbox token input from user
  const requestMapboxToken = () => {
    const token = prompt("Digite seu token público do Mapbox para visualizar o mapa:");
    if (token) {
      setMapboxToken(token);
      localStorage.setItem("mapbox-token", token);
      return token;
    }
    return null;
  };

  useEffect(() => {
    // Try to get token from localStorage
    const savedToken = localStorage.getItem("mapbox-token");
    if (savedToken) {
      setMapboxToken(savedToken);
    }
  }, []);

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
          
          // Initialize map after getting location
          initializeMap(newPosition.lat, newPosition.lng);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          // Initialize map with default location on error
          initializeMap(-23.5505, -46.6333); // São Paulo as default
        }
      );
    } else {
      console.error("Geolocalização não é suportada pelo seu navegador");
      // Initialize map with default location if geolocation not supported
      initializeMap(-23.5505, -46.6333); // São Paulo as default
    }
  };

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainer.current) return;
    
    let token = mapboxToken;
    if (!token) {
      token = requestMapboxToken();
      if (!token) return; // User cancelled token input
    }

    mapboxgl.accessToken = token;
    
    if (map.current) return; // Map already initialized
    
    // Create the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: 15
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    // Add marker
    marker.current = new mapboxgl.Marker({ color: "#FF4136" })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Add click event to the map
    map.current.on("click", (event) => {
      const { lng, lat } = event.lngLat;
      
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      }
      
      const newPosition = { lat, lng };
      setPosition(newPosition);
      
      if (onLocationSelected) {
        onLocationSelected(lat, lng);
      }
    });
  };

  // Initialize map if we already have position and token
  useEffect(() => {
    if (position && mapboxToken && hasRequestedLocation) {
      initializeMap(position.lat, position.lng);
    }
  }, [position, mapboxToken, hasRequestedLocation]);

  // Update marker position when initialLocation changes
  useEffect(() => {
    if (initialLocation && marker.current && map.current) {
      marker.current.setLngLat([initialLocation.lng, initialLocation.lat]);
      map.current.flyTo({
        center: [initialLocation.lng, initialLocation.lat],
        zoom: 15,
        essential: true
      });
    }
  }, [initialLocation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full rounded-lg overflow-hidden"
    >
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
      ) : (
        <>
          <div ref={mapContainer} className="absolute inset-0" />
          
          {position && !mapboxToken && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs text-center z-10">
                <p className="text-sm mb-4">
                  Para visualizar o mapa, precisamos de um token do Mapbox.
                </p>
                <button 
                  className="bg-iparty hover:bg-iparty-dark text-white px-4 py-2 rounded-md transition-colors"
                  onClick={() => requestMapboxToken()}
                >
                  Fornecer token
                </button>
              </div>
            </div>
          )}
          
          {position && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow-lg z-10 text-sm text-center">
              <p>Clique no mapa para ajustar a posição exata do seu espaço</p>
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
