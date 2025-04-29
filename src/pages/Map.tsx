
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import LocationMap from "@/components/LocationMap";

const Map = () => {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  const handleLocationSelected = (lat: number, lng: number) => {
    setLocation({ lat, lng });
    console.log("Localização selecionada:", { lat, lng });
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto h-full">
      <h1 className="text-2xl font-bold mb-6">Mapa de Espaços</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar por localização..." 
          className="pl-10"
        />
      </div>

      <div className="bg-gray-200 rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
        <LocationMap onLocationSelected={handleLocationSelected} initialLocation={location} />
      </div>
    </div>
  );
};

export default Map;
