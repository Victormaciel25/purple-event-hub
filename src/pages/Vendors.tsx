
import React, { useState } from "react";
import VendorCard from "@/components/VendorCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const vendors = [
  {
    id: "1",
    name: "Buffet Delicias",
    category: "Buffet",
    rating: 4.8,
    contactNumber: "(11) 99999-8888",
    image: "https://source.unsplash.com/random/200x200?food",
  },
  {
    id: "2",
    name: "DJ Master Sound",
    category: "DJ",
    rating: 4.7,
    contactNumber: "(11) 98888-7777",
    image: "https://source.unsplash.com/random/200x200?dj",
  },
  {
    id: "3",
    name: "Flor & Arte Decorações",
    category: "Decoração",
    rating: 5.0,
    contactNumber: "(11) 97777-6666",
    image: "https://source.unsplash.com/random/200x200?flowers",
  },
  {
    id: "4",
    name: "Click Fotografias",
    category: "Fotografia",
    rating: 4.9,
    contactNumber: "(11) 96666-5555",
    image: "https://source.unsplash.com/random/200x200?camera",
  },
];

const Vendors = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contactNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fornecedores</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar fornecedores..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
          <TabsTrigger value="buffet" className="flex-1">Buffet</TabsTrigger>
          <TabsTrigger value="dj" className="flex-1">DJ</TabsTrigger>
          <TabsTrigger value="decoration" className="flex-1">Decoração</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {filteredVendors.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="buffet" className="mt-4">
          <div className="space-y-4">
            {filteredVendors
              .filter((vendor) => vendor.category === "Buffet")
              .map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="dj" className="mt-4">
          <div className="space-y-4">
            {filteredVendors
              .filter((vendor) => vendor.category === "DJ")
              .map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="decoration" className="mt-4">
          <div className="space-y-4">
            {filteredVendors
              .filter((vendor) => vendor.category === "Decoração")
              .map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Vendors;
