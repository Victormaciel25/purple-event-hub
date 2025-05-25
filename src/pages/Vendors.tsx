
import React, { useState, useEffect } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search, ChefHat, Camera, Video, FileText, Shirt, Palette, Cookie, Cake, Sparkles, Clipboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  images: string[];
  rating?: number;
};

const predefinedCategories = [
  { name: "Todos", icon: Sparkles },
  { name: "Buffet", icon: ChefHat },
  { name: "Fotografia", icon: Camera }, 
  { name: "Videomaker", icon: Video },
  { name: "Storymaker", icon: FileText },
  { name: "Vestidos", icon: Shirt },
  { name: "Maquiagem", icon: Palette },
  { name: "Doceria", icon: Cookie },
  { name: "Bolo", icon: Cake },
  { name: "Decoração", icon: Sparkles },
  { name: "Assessoria", icon: Clipboard }
];

const Vendors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      console.log("Fetching approved vendors...");
      
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching vendors:", error);
        throw error;
      }

      console.log("Vendors fetched:", data);
      console.log("Number of approved vendors:", data ? data.length : 0);

      if (data) {
        const processedVendors = data.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          category: vendor.category,
          contact_number: vendor.contact_number,
          images: vendor.images || [],
        }));

        setVendors(processedVendors);
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast.error("Não foi possível carregar os fornecedores");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="relative mb-6">
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
          <div className="mb-6">
            <Carousel className="w-full max-w-sm mx-auto">
              <CarouselContent>
                {predefinedCategories.map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <CarouselItem key={category.name} className="basis-1/3">
                      <div 
                        className={cn(
                          "flex flex-col items-center justify-center p-4 cursor-pointer transition-all",
                          selectedCategory === category.name
                            ? "text-primary"
                            : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-colors",
                          selectedCategory === category.name
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted hover:bg-primary/10"
                        )}>
                          <IconComponent size={24} />
                        </div>
                        <span className="text-xs text-center font-medium">
                          {category.name}
                        </span>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
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
