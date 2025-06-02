
import React, { useState } from "react";
import PromotedSpaceCard from "@/components/PromotedSpaceCard";
import { Input } from "@/components/ui/input";
import { Search, Circle, Heart, Briefcase, Cake, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPACE_CATEGORIES } from "@/config/app-config";
import { usePromotedSpaces } from "@/hooks/usePromotedSpaces";

const Explore = () => {
  const { spaces, loading, error } = usePromotedSpaces();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(SPACE_CATEGORIES.ALL);
  
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  // Filter spaces based on search term across multiple fields and by category
  const filteredSpaces = React.useMemo(() => {
    console.log('=== FILTERING DEBUG ===');
    console.log('Active category:', activeCategory);
    console.log('SPACE_CATEGORIES.ALL:', SPACE_CATEGORIES.ALL);
    console.log('All spaces:', spaces.map(s => ({ 
      name: s.name, 
      categories: s.categories, 
      isPromoted: s.isPromoted 
    })));
    
    let filtered = spaces.filter(space => {
      // First filter by category if not "all"
      if (activeCategory !== SPACE_CATEGORIES.ALL) {
        console.log(`\n--- Checking space "${space.name}" ---`);
        console.log('Space categories:', space.categories);
        console.log('Looking for category:', activeCategory);
        console.log('Categories type:', typeof space.categories);
        console.log('Is array:', Array.isArray(space.categories));
        
        if (!space.categories || !Array.isArray(space.categories)) {
          console.log(`❌ Space "${space.name}" has no valid categories array`);
          return false;
        }
        
        // Ensure we're comparing strings properly
        const normalizedSpaceCategories = space.categories.map(cat => String(cat).toLowerCase());
        const normalizedActiveCategory = String(activeCategory).toLowerCase();
        
        console.log('Normalized space categories:', normalizedSpaceCategories);
        console.log('Normalized active category:', normalizedActiveCategory);
        
        const hasCategory = normalizedSpaceCategories.includes(normalizedActiveCategory);
        console.log(`Space "${space.name}" has category "${activeCategory}":`, hasCategory);
        
        if (!hasCategory) {
          console.log(`❌ Space "${space.name}" does NOT have category "${activeCategory}"`);
          return false;
        }
        
        console.log(`✅ Space "${space.name}" HAS category "${activeCategory}"`);
      } else {
        console.log(`✅ Showing all categories - including space "${space.name}"`);
      }
      
      // Then filter by search term across multiple fields
      if (searchTerm === "") return true;
      
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        space.name.toLowerCase().includes(term) ||
        space.address.toLowerCase().includes(term) ||
        space.description.toLowerCase().includes(term) ||
        space.state.toLowerCase().includes(term) ||
        space.price.toLowerCase().includes(term)
      );
      
      console.log(`Search filter for "${space.name}":`, matchesSearch);
      return matchesSearch;
    });

    console.log('\n=== FILTER RESULTS ===');
    console.log('Filtered spaces before sorting:', filtered.map(s => ({ 
      name: s.name, 
      isPromoted: s.isPromoted 
    })));

    // Sort filtered spaces: promoted first, then normal spaces
    // This ensures promoted spaces are first within the selected category
    const sorted = filtered.sort((a, b) => {
      // If both are promoted or both are not promoted, maintain original order
      if (a.isPromoted === b.isPromoted) {
        return 0;
      }
      // Promoted spaces come first
      return a.isPromoted ? -1 : 1;
    });
    
    console.log('Final sorted spaces:', sorted.map(s => ({ 
      name: s.name, 
      isPromoted: s.isPromoted 
    })));
    console.log('=== END FILTERING DEBUG ===\n');
    
    return sorted;
  }, [spaces, activeCategory, searchTerm]);

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
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <button 
            className={`${activeCategory === SPACE_CATEGORIES.ALL ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
              rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
            onClick={() => {
              console.log('Clicking "Todos" button');
              setActiveCategory(SPACE_CATEGORIES.ALL);
            }}
          >
            <Circle className="mb-1" size={20} />
            <span>Todos</span>
          </button>
          
          <button 
            className={`${activeCategory === SPACE_CATEGORIES.WEDDINGS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
              rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
            onClick={() => {
              console.log('Clicking "Casamentos" button');
              setActiveCategory(SPACE_CATEGORIES.WEDDINGS);
            }}
          >
            <Heart className="mb-1" size={20} />
            <span>Casamentos</span>
          </button>
          
          <button 
            className={`${activeCategory === SPACE_CATEGORIES.CORPORATE ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
              rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
            onClick={() => {
              console.log('Clicking "Corporativo" button');
              setActiveCategory(SPACE_CATEGORIES.CORPORATE);
            }}
          >
            <Briefcase className="mb-1" size={20} />
            <span>Corporativo</span>
          </button>
          
          <button 
            className={`${activeCategory === SPACE_CATEGORIES.BIRTHDAYS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
              rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
            onClick={() => {
              console.log('Clicking "Aniversários" button');
              setActiveCategory(SPACE_CATEGORIES.BIRTHDAYS);
            }}
          >
            <Cake className="mb-1" size={20} />
            <span>Aniversários</span>
          </button>
          
          <button 
            className={`${activeCategory === SPACE_CATEGORIES.GRADUATIONS ? 'bg-iparty text-white' : 'bg-secondary text-foreground'} 
              rounded-lg px-3 py-1 text-xs flex flex-col items-center min-w-[70px] transition-all`}
            onClick={() => {
              console.log('Clicking "Formaturas" button');
              setActiveCategory(SPACE_CATEGORIES.GRADUATIONS);
            }}
          >
            <GraduationCap className="mb-1" size={20} />
            <span>Formaturas</span>
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
              showTimer={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
