
import React, { useState, useEffect } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_number: string;
  images: string[];
  rating?: number;
};

const Vendors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

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

      if (data) {
        // Process the data obtained from Supabase
        const processedVendors = data.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          category: vendor.category,
          contact_number: vendor.contact_number,
          images: vendor.images || [],
          rating: 4.8, // Default rating until we implement a rating system
        }));

        console.log("Processed vendors:", processedVendors);

        // Extract unique categories for tabs
        const uniqueCategories = Array.from(
          new Set(processedVendors.map((vendor) => vendor.category))
        );

        setVendors(processedVendors);
        setCategories(uniqueCategories);
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
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="all" className="flex-1">
              Todos
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category.toLowerCase()}
                className="flex-1"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.name}
                  category={vendor.category}
                  rating={vendor.rating || 4.5}
                  contactNumber={vendor.contact_number}
                  image={vendor.images[0] || "https://source.unsplash.com/random/200x200?food"}
                />
              ))}
            </div>
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category.toLowerCase()} className="mt-4">
              <div className="space-y-4">
                {filteredVendors
                  .filter((vendor) => vendor.category === category)
                  .map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      id={vendor.id}
                      name={vendor.name}
                      category={vendor.category}
                      rating={vendor.rating || 4.5}
                      contactNumber={vendor.contact_number}
                      image={vendor.images[0] || "https://source.unsplash.com/random/200x200?food"}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default Vendors;
