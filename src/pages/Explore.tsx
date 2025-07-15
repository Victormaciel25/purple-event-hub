
import React, { useState } from "react";
import PromotedSpaceCard from "@/components/PromotedSpaceCard";
import { Input } from "@/components/ui/input";
import { Search, Circle, Heart, Briefcase, Cake, GraduationCap } from "lucide-react";
import { SPACE_CATEGORIES } from "@/config/app-config";
import { useAppData } from "@/hooks/useAppData";
import { ExplorePageSkeleton } from "@/components/LoadingSkeleton";

const Explore = () => {
  const { spaces, loading, userLocation } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(SPACE_CATEGORIES.ALL);
  
  // Filtrar espaços com base na busca e categoria
  const filteredSpaces = React.useMemo(() => {
    console.log('🔍 EXPLORE: Filtering spaces...', { total: spaces.length, searchTerm, activeCategory });
    
    let filtered = spaces;
    
    // Filtrar por categoria
    if (activeCategory !== SPACE_CATEGORIES.ALL) {
      filtered = spaces.filter(space => {
        if (!space.categories || !Array.isArray(space.categories)) return false;
        const normalizedCategories = space.categories.map(cat => String(cat).toLowerCase());
        return normalizedCategories.includes(String(activeCategory).toLowerCase());
      });
    }
    
    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(space =>
        space.name.toLowerCase().includes(term) ||
        space.address.toLowerCase().includes(term) ||
        space.description.toLowerCase().includes(term) ||
        space.state.toLowerCase().includes(term) ||
        space.price.toLowerCase().includes(term)
      );
    }
    
    console.log(`🔍 EXPLORE: Filtered to ${filtered.length} spaces`);
    return filtered;
  }, [spaces, activeCategory, searchTerm]);

  const categories = [
    { key: SPACE_CATEGORIES.ALL, label: "Todos", icon: Circle },
    { key: SPACE_CATEGORIES.WEDDINGS, label: "Casamentos", icon: Heart },
    { key: SPACE_CATEGORIES.CORPORATE, label: "Corporativo", icon: Briefcase },
    { key: SPACE_CATEGORIES.BIRTHDAYS, label: "Aniversários", icon: Cake },
    { key: SPACE_CATEGORIES.GRADUATIONS, label: "Formaturas", icon: GraduationCap }
  ];

  if (loading) {
    return <ExplorePageSkeleton />;
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar espaços de eventos..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-3 px-1 pt-1 w-max">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.key;
              
              return (
                <button
                  key={category.key}
                  className={`
                    relative flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl 
                    transition-all duration-300 transform hover:scale-105 hover:shadow-md flex-shrink-0
                    ${isActive 
                      ? 'bg-iparty text-white shadow-md' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => setActiveCategory(category.key)}
                >
                  <Icon 
                    size={20} 
                    className={`mb-1 ${isActive ? 'text-white' : 'text-gray-500'}`} 
                  />
                  <span className={`text-xs font-medium leading-tight text-center px-1 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {category.label}
                  </span>
                  
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            {spaces.length === 0 
              ? "Nenhum espaço encontrado." 
              : `Nenhum espaço encontrado${activeCategory !== SPACE_CATEGORIES.ALL ? ` na categoria selecionada` : ""}.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
          {filteredSpaces.map((space) => (
            <div key={space.id} className="relative">
              <PromotedSpaceCard 
                id={space.id}
                name={space.name}
                address={`${space.address}, ${space.number} - ${space.state}`}
                price={parseFloat(space.price)}
                image={space.photo_url || ""}
                isPromoted={space.isPromoted}
                promotionExpiresAt={space.promotionExpiresAt}
                showTimer={false}
              />
              {space.distanceKm && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                  {space.distanceKm.toFixed(1)} km
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
