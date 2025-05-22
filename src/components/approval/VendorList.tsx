
import React from "react";
import VendorListItem, { VendorItemProps } from "./VendorListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VendorListProps {
  vendors: VendorItemProps[];
  loading: boolean;
  onViewDetails: (vendorId: string) => void;
}

const VendorList: React.FC<VendorListProps> = ({ vendors, loading, onViewDetails }) => {
  // Filtrar fornecedores por status
  const pendingVendors = vendors.filter((vendor) => vendor.status === "pending");
  const approvedVendors = vendors.filter((vendor) => vendor.status === "approved");
  const rejectedVendors = vendors.filter((vendor) => vendor.status === "rejected");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando fornecedores...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="pending" className="mb-6">
      <TabsList className="mb-4">
        <TabsTrigger value="pending" className="relative">
          Pendentes
          {pendingVendors.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingVendors.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="approved">Aprovados</TabsTrigger>
        <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Fornecedores Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingVendors.length > 0 ? (
              pendingVendors.map((vendor) => (
                <VendorListItem
                  key={vendor.id}
                  {...vendor}
                  onViewDetails={onViewDetails}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Nenhum fornecedor pendente de aprovação.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="approved">
        <Card>
          <CardHeader>
            <CardTitle>Fornecedores Aprovados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedVendors.length > 0 ? (
              approvedVendors.map((vendor) => (
                <VendorListItem
                  key={vendor.id}
                  {...vendor}
                  onViewDetails={onViewDetails}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Nenhum fornecedor aprovado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rejected">
        <Card>
          <CardHeader>
            <CardTitle>Fornecedores Rejeitados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejectedVendors.length > 0 ? (
              rejectedVendors.map((vendor) => (
                <VendorListItem
                  key={vendor.id}
                  {...vendor}
                  onViewDetails={onViewDetails}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Nenhum fornecedor rejeitado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default VendorList;
