
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FavoriteSpaces from "./FavoriteSpaces";
import FavoriteVendors from "./FavoriteVendors";

const FavoriteTabs = () => {
  return (
    <Tabs defaultValue="spaces" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="spaces">Espaços</TabsTrigger>
        <TabsTrigger value="vendors">Fornecedores</TabsTrigger>
      </TabsList>
      
      <TabsContent value="spaces" className="mt-4">
        <FavoriteSpaces />
      </TabsContent>
      
      <TabsContent value="vendors" className="mt-4">
        <FavoriteVendors />
      </TabsContent>
    </Tabs>
  );
};

export default FavoriteTabs;
