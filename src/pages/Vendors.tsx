
import React, { useState, useEffect } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  images: string[];
  rating?: number;
};

const predefinedCategories = [
  "Todos",
  "Buffet",
  "Fotografia", 
  "Videomaker",
  "Storymaker",
  "Vestidos",
  "Maquiagem",
  "Doceria",
  "Bolo",
  "Decoração",
  "Assessoria"
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
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2 pb-2">
                {predefinedCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
