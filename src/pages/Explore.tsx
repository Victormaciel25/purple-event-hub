
import React, { useState, useEffect } from "react";
import EventSpaceCard from "@/components/EventSpaceCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APP_CONSTANTS, STORAGE, SPACE_CATEGORIES } from "@/config/app-config";

type EventSpace = {
  id: string;
  name: string;
  address: string;
  price: string;
  number: string;
  state: string;
  photo_url?: string;
  description: string;
  categories?: string[];
};

const Explore = () => {
  const [spaces, setSpaces] = useState<EventSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(SPACE_CATEGORIES.ALL);
  
  useEffect(() => {
    fetchApprovedSpaces();
  }, []);
  
  const fetchApprovedSpaces = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("spaces")
        .select(`
          id,
          name,
          address,
          number,
          state,
          price,
          description,
          categories,
          space_photos(storage_path)
        `)
        .eq("status", "approved");
        
      if (error) {
        throw error;
      }
      
      // Process data to match our component's format
      const processedSpaces = await Promise.all((data || []).map(async (space) => {
        let photoUrl = APP_CONSTANTS.DEFAULT_SPACE_IMAGE;
        
        // If there are photos, get the URL for the first one
        if (space.space_photos && space.space_photos.length > 0) {
          const { data: urlData } = await supabase.storage
            .from(STORAGE.SPACES_BUCKET)
            .createSignedUrl(space.space_photos[0].storage_path, 3600);
            
          if (urlData) {
            photoUrl = urlData.signedUrl;
          }
        }
        
        return {
          id: space.id,
          name: space.name,
          address: space.address,
          number: space.number,
          state: space.state,
          price: space.price,
          description: space.description,
          categories: space.categories || [],
          photo_url: photoUrl
        };
      }));
      
      setSpaces(processedSpaces);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      toast.error("Erro ao carregar espaços");
    } finally {
      setLoading(false);
    }
  };
  
  // Filter spaces based on search term across multiple fields and by category
  const filteredSpaces = spaces.filter(space => {
    // First filter by category if not "all"
    if (activeCategory !== SPACE_CATEGORIES.ALL && 
        (!space.categories || !space.categories.includes(activeCategory))) {
      return false;
    }
    
    // Then filter by search term across multiple fields
    if (searchTerm === "") return true;
    
    const term = searchTerm.toLowerCase();
    return (
      space.name.toLowerCase().includes(term) ||
      space.address.toLowerCase().includes(term) ||
      space.description.toLowerCase().includes(term) ||
      space.state.toLowerCase().includes(term) ||
      space.price.toLowerCase().includes(term)
    );
  });

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar espaços de eventos..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">Carregando espaços...</p>
        </div>
      ) : filteredSpaces.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">Nenhum espaço encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
          {filteredSpaces.map((space) => (
            <EventSpaceCard 
              key={space.id} 
              id={space.id}
              name={space.name}
              address={`${space.address}, ${space.number} - ${space.state}`}
              price={parseFloat(space.price)}
              image={space.photo_url || APP_CONSTANTS.DEFAULT_SPACE_IMAGE}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
