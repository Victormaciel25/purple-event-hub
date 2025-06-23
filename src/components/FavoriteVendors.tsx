
import React from "react";
import { useVendorFavorites } from "@/hooks/useVendorFavorites";
import VendorCard from "./VendorCard";

const FavoriteVendors = () => {
  const { favoriteVendors, loading, error } = useVendorFavorites();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Carregando fornecedores favoritos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-2">Erro ao carregar favoritos</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (favoriteVendors.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-2">Você ainda não tem fornecedores favoritos</p>
        <p className="text-sm text-gray-500">
          Explore fornecedores e adicione aos seus favoritos para vê-los aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {favoriteVendors.map((vendor) => (
        <VendorCard 
          key={vendor.id}
          id={vendor.id}
          name={vendor.name}
          category={vendor.category}
          rating={0}
          contactNumber={vendor.contact_number}
          image={vendor.images?.[0] || "/placeholder.svg"}
          address={vendor.address}
        />
      ))}
    </div>
  );
};

export default FavoriteVendors;
