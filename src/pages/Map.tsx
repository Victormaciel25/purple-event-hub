
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Map = () => {
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
        <div className="text-center p-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-medium mb-2">Mapa de Localização</h2>
            <p className="text-muted-foreground">
              Encontre espaços de eventos próximos a você
            </p>
            <div className="mt-4 flex justify-center">
              <button className="bg-iparty hover:bg-iparty-dark text-white px-4 py-2 rounded-md transition-colors">
                Permitir localização
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
