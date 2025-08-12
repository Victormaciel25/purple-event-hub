
import React, { useState } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search, ChefHat, Camera, Video, FileText, Shirt, Palette, Cookie, Cake, Sparkles, Clipboard } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { VendorsPageSkeleton } from "@/components/LoadingSkeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
  const { vendors, loading } = useAppData();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredVendors = React.useMemo(() => {
    console.log('🔍 VENDORS: Filtering vendors...', { total: vendors.length, searchTerm, selectedCategory });
    
    let filtered = vendors.filter((vendor) => {
      // Filtrar por busca
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contact_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar por categoria
      const matchesCategory = selectedCategory === "Todos" || vendor.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    console.log(`🔍 VENDORS: Filtered to ${filtered.length} vendors`);
    filtered.forEach((vendor, index) => {
      console.log(`📋 VENDOR ${index + 1}:`, {
        name: vendor.name,
        image: vendor.images?.[0],
        hasImage: !!(vendor.images?.[0])
      });
    });
    
    return filtered;
  }, [vendors, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredVendors.length / pageSize);
  const paginatedVendors = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  if (loading) {
    return <VendorsPageSkeleton />;
  }

  return (
    <div className="container px-4 pt-6 pb-16 max-w-4xl mx-auto flex min-h-screen flex-col">
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

      <div className="flex-1">
        <div className="space-y-4">
          {paginatedVendors.length > 0 ? (
            paginatedVendors.map((vendor) => (
              <VendorCard
                key={`${vendor.id}-${Date.now()}`}
                id={vendor.id}
                name={vendor.name}
                category={vendor.category}
                rating={0}
                contactNumber={vendor.contact_number}
                image={vendor.images[0] || "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop"}
                isPromoted={vendor.isPromoted}
                instagram={vendor.instagram}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {vendors.length === 0 
                ? "Nenhum fornecedor aprovado encontrado."
                : `Nenhum fornecedor encontrado${selectedCategory !== "Todos" ? ` na categoria "${selectedCategory}"` : ""}`
              }
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-2 mb-1">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === i + 1}
                  onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default Vendors;