import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker
} from "@react-google-maps/api";
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
  initialLocation?: { lat: number; lng: number } | null;
  viewOnly?: boolean;
  spaces?: Space[];
  onSpaceClick?: (spaceId: string) => void;
  isLoading?: boolean;
  onMapLoad?: (map: google.maps.Map) => void;
  keepPinsVisible?: boolean;
}

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
  const [position, setPosition] = useState(initialLocation || null);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [popupPixel, setPopupPixel] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["places"]
  });

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (!selectedSpace || !mapInstance) return;
    const projection = mapInstance.getProjection();
    if (!projection) return;

    const scale = Math.pow(2, mapInstance.getZoom() || 15);
    const bounds = mapInstance.getBounds();
    if (!bounds) return;

    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const worldPoint = projection.fromLatLngToPoint(
      new google.maps.LatLng(selectedSpace.latitude, selectedSpace.longitude)
    );

    const x = (worldPoint.x - bottomLeft.x) * scale;
    const y = (worldPoint.y - topRight.y) * scale;

    setPopupPixel({ x, y });
  }, [selectedSpace, mapInstance]);

  const handleMapLoad = (map: google.maps.Map) => {
    setMapInstance(map);
    if (onMapLoad) onMapLoad(map);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (viewOnly || !e.latLng) return;
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setPosition(newPos);
    onLocationSelected?.(newPos.lat, newPos.lng);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-xl overflow-hidden">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={position || { lat: -23.5505, lng: -46.6333 }}
          zoom={15}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          options={{
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            zoomControl: true,
            styles: [
              {
                featureType: "poi",
                elementType: "all",
                stylers: [{ visibility: "off" }]
              }
            ],
            gestureHandling: "greedy"
          }}
        >
          {spaces.map((space) => (
            <Marker
              key={space.id}
              position={{ lat: space.latitude, lng: space.longitude }}
              onClick={() => setSelectedSpace(space)}
              animation={google.maps.Animation.DROP}
            />
          ))}
        </GoogleMap>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-6 w-6 animate-spin text-iparty" />
        </div>
      )}

      {popupPixel && selectedSpace && (
        <div
          className="absolute z-50"
          style={{
            left: popupPixel.x,
            top: popupPixel.y - 240,
            transform: "translate(-50%, -100%)"
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-[280px]">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="font-bold text-base text-iparty truncate">
                {selectedSpace.name}
              </h3>
              <button onClick={() => setSelectedSpace(null)}>
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            {selectedSpace.imageUrl && (
              <OptimizedImage
                src={selectedSpace.imageUrl}
                alt={selectedSpace.name}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4 text-sm text-gray-700">
              <p>
                {selectedSpace.address}, {selectedSpace.number} - {selectedSpace.state}
              </p>
              {selectedSpace.zipCode && <p>CEP: {selectedSpace.zipCode}</p>}
              <div className="mt-2 text-right">
                <span className="text-xs text-iparty font-medium cursor-pointer">
                  Ver detalhes →
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
