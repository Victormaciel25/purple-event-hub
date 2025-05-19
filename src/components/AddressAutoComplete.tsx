
import React, { useEffect, useRef } from "react";
import { Input } from "./ui/input";

type GeocodingResult = {
  lat: number;
  lng: number;
  locationName: string;
};

interface AddressAutoCompleteProps {
  onLocationSelected: (location: GeocodingResult) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
}

const AddressAutoComplete = ({
  onLocationSelected,
  initialValue = "",
  placeholder = "Buscar endereço...",
  className = "",
}: AddressAutoCompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initializeAutocomplete = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places || !inputRef.current) {
      console.log("Google Maps Places API não disponível ainda");
      return;
    }

    try {
      console.log("Criando instância do Autocomplete");
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        console.log("Local selecionado:", place);
        
        if (place.geometry && place.geometry.location) {
          const location: GeocodingResult = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            locationName: place.formatted_address || "",
          };
          
          console.log("Enviando localização:", location);
          onLocationSelected(location);
        }
      });
      
      console.log("Autocomplete inicializado com sucesso");
    } catch (error) {
      console.error("Erro ao inicializar o Autocomplete:", error);
    }
  };

  // Usamos um intervalo para esperar que o Google Maps API e o Places estejam carregados
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places &&
        inputRef.current &&
        !autocompleteRef.current
      ) {
        console.log("Inicializando Autocomplete...");
        initializeAutocomplete();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [inputRef.current, window.google]);

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={initialValue}
        className="w-full"
      />
    </div>
  );
};

export default AddressAutoComplete;
