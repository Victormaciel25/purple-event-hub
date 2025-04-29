
import React from "react";
import { MapPin } from "lucide-react";

const LocationMap = () => {
  return (
    <div className="relative w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="absolute inset-0 opacity-30 bg-gradient-radial from-transparent to-black/20 rounded-lg" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <MapPin size={40} className="text-red-500" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs text-center z-10">
        <p className="text-sm">
          Para uma melhor experiência, implementaremos um mapa real nesta área 
          que permitirá selecionar com precisão a localização do seu espaço.
        </p>
      </div>
    </div>
  );
};

export default LocationMap;
