import React, { useState } from "react";
import PromotedSpaceCard from "@/components/PromotedSpaceCard";
import { Input } from "@/components/ui/input";
import { Search, Circle, Heart, Briefcase, Cake, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPACE_CATEGORIES } from "@/config/app-config";
import { usePromotedSpaces } from "@/hooks/usePromotedSpaces";

const Explore = () => {
  const { spaces, loading, error } = usePromotedSpaces();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(SPACE_CATEGORIES.ALL);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
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

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

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

      <div className="space-y-2 mb-6">
        <div className="relative">
          <button 
            onClick={handleScrollLeft} 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-md p-1 z-10"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="overflow-hidden mx-6">
            <div 
              ref={scrollContainerRef} 
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
              style={{ scrollbarWidth: 'none' }}
            >
              <button 
                className={`${activeCategory === SPACE_CATEGORIES.ALL ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
                  rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
                onClick={() => setActiveCategory(SPACE_CATEGORIES.ALL)}
              >
                <Circle className="mb-1" size={20} />
                <span>Todos</span>
              </button>
              
              <button 
                className={`${activeCategory === SPACE_CATEGORIES.WEDDINGS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
                  rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
                onClick={() => setActiveCategory(SPACE_CATEGORIES.WEDDINGS)}
              >
                <Heart className="mb-1" size={20} />
                <span>Casamentos</span>
              </button>
              
              <button 
                className={`${activeCategory === SPACE_CATEGORIES.CORPORATE ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
                  rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
                onClick={() => setActiveCategory(SPACE_CATEGORIES.CORPORATE)}
              >
                <Briefcase className="mb-1" size={20} />
                <span>Corporativo</span>
              </button>
              
              <button 
                className={`${activeCategory === SPACE_CATEGORIES.BIRTHDAYS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
                  rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
                onClick={() => setActiveCategory(SPACE_CATEGORIES.BIRTHDAYS)}
              >
                <Cake className="mb-1" size={20} />
                <span>Aniversários</span>
              </button>
              
              <button 
                className={`${activeCategory === SPACE_CATEGORIES.GRADUATIONS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
                  rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
                onClick={() => setActiveCategory(SPACE_CATEGORIES.GRADUATIONS)}
              >
                <GraduationCap className="mb-1" size={20} />
                <span>Formaturas</span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleScrollRight} 
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-md p-1 z-10"
          >
            <ChevronRight size={20} />
          </button>
        </div>
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
            <PromotedSpaceCard 
              key={space.id} 
              id={space.id}
              name={space.name}
              address={`${space.address}, ${space.number} - ${space.state}`}
              price={parseFloat(space.price)}
              image={space.photo_url || ""}
              isPromoted={space.isPromoted}
              promotionExpiresAt={space.promotionExpiresAt}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
