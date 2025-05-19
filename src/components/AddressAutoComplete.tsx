
import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { EDGE_FUNCTIONS } from '@/config/app-config';
import { toast } from 'sonner';

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
}

interface AddressAutoCompleteProps {
  onLocationSelected: (location: {
    lat: number;
    lng: number;
    locationName: string;
  }) => void;
  initialValue?: string;
  placeholder?: string;
}

const AddressAutoComplete: React.FC<AddressAutoCompleteProps> = ({
  onLocationSelected,
  initialValue = '',
  placeholder = 'Buscar por endereço ou local...'
}) => {
  const [searchValue, setSearchValue] = useState<string>(initialValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Função para buscar sugestões de endereços
  const fetchSuggestions = async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(EDGE_FUNCTIONS.PLACES_AUTOCOMPLETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'autocomplete',
          input: input
        }),
      });
      
      const data = await response.json();
      
      if (data.status === "OK" && data.predictions) {
        setSuggestions(data.predictions);
      } else {
        console.error("Erro ao buscar sugestões:", data.status);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
      toast.error("Erro ao buscar sugestões de endereço");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para buscar detalhes de um local (incluindo lat/lng)
  const fetchPlaceDetails = async (placeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(EDGE_FUNCTIONS.PLACE_DETAILS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'placeDetails',
          placeId: placeId
        }),
      });
      
      const data = await response.json();
      
      if (data.status === "OK" && data.result) {
        const details = data.result;
        
        onLocationSelected({
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          locationName: details.formatted_address
        });
        
        setSearchValue(details.formatted_address);
        setOpen(false);
      } else {
        console.error("Erro ao buscar detalhes do local:", data.status);
        toast.error("Erro ao buscar detalhes do local");
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do local:", error);
      toast.error("Erro ao buscar detalhes do local");
    } finally {
      setLoading(false);
    }
  };
  
  // Input change handler com debounce
  const handleInputChange = (value: string) => {
    setSearchValue(value);
    
    // Limpa o timeout anterior se existir
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Define um novo timeout para buscar sugestões
    const timeout = setTimeout(() => {
      fetchSuggestions(value);
    }, 300); // Delay de 300ms para reduzir o número de requisições
    
    setDebounceTimeout(timeout);
    
    // Se o valor for vazio, não mostra o dropdown
    if (!value.trim()) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  };
  
  // Limpar a busca
  const clearSearch = () => {
    setSearchValue('');
    setSuggestions([]);
    setOpen(false);
  };
  
  // Limpa o timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
          size={18} 
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchValue && (
          <X 
            className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
            size={16}
            onClick={clearSearch}
          />
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
        )}
      </div>
      
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-popover rounded-md border mt-1 shadow-md">
          <ul className="py-2 max-h-[300px] overflow-auto">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => fetchPlaceDetails(suggestion.place_id)}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                <div className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressAutoComplete;
