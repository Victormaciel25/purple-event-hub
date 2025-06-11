import React, { useState } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search, ChefHat, Camera, Video, FileText, Shirt, Palette, Cookie, Cake, Sparkles, Clipboard } from "lucide-react";
import { toast } from "sonner";
import { usePromotedVendors } from "@/hooks/usePromotedVendors";

const predefinedCategories = [
  { name: "Todos", icon: Sparkles },
  { name: "Buffet", icon: ChefHat },
  { name: "Fotografia", icon: Camera }, 
  { name: "Videomaker", icon: Video },
  { name: "Storymaker", icon: FileText },
  { name: "Vestido", icon: Shirt },
  { name: "Maquiagem", icon: Palette },
  { name: "Doceria", icon: Cookie },
  { name: "Bolo", icon: Cake },
  { name: "Decoração", icon: Sparkles },
  { name: "Assessoria", icon: Clipboard }
];

const Vendors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const { vendors, loading, error } = usePromotedVendors();

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVendorsByCategory = (category: string) => {
    if (category === "Todos") {
      return filteredVendors;
    }
    return filteredVendors.filter((vendor) => vendor.category === category);
  };

  const currentVendors = getVendorsByCategory(selectedCategory);

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <Input
          placeholder="Buscar fornecedores..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando fornecedores...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-10">
          Nenhum fornecedor aprovado encontrado.
        </div>
      ) : (
        <>
          <div className="mb-2">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-3 px-1 pt-1 w-max">
                {predefinedCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.name;
                  
                  return (
                    <button
                      key={category.name}
                      className={`
                        relative flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl 
                        transition-all duration-300 transform hover:scale-105 hover:shadow-md flex-shrink-0
                        ${isActive 
                          ? 'bg-iparty text-white shadow-md' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <Icon 
                        size={20} 
                        className={`mb-1 ${isActive ? 'text-white' : 'text-gray-500'}`} 
                      />
                      <span className={`text-xs font-medium leading-tight text-center px-1 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        {category.name}
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

          <div className="space-y-4">
            {currentVendors.length > 0 ? (
              currentVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.name}
                  category={vendor.category}
                  rating={0}
                  contactNumber={vendor.contact_number}
                  image={vendor.images[0] || "https://source.unsplash.com/random/200x200?food"}
                  isPromoted={vendor.isPromoted}
                  address={vendor.address}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor encontrado
                {selectedCategory !== "Todos" && ` na categoria "${selectedCategory}"`}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Vendors;
