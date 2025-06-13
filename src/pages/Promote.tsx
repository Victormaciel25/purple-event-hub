
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Home, Store } from "lucide-react";

const Promote: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container px-4 py-6 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Promover</h1>
      </div>

      <div className="space-y-4">
        <p className="text-gray-600 mb-6">
          Escolha o que você deseja promover:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Promover Espaço */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/promote-space")}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-iparty/10 rounded-full flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-iparty" />
              </div>
              <CardTitle className="text-xl">Espaço</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Destaque seu espaço para eventos e aumente sua visibilidade
              </p>
              <Button className="w-full bg-iparty hover:bg-iparty/90">
                Promover Espaço
              </Button>
            </CardContent>
          </Card>

          {/* Promover Fornecedor */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/promote-vendor")}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-iparty/10 rounded-full flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-iparty" />
              </div>
              <CardTitle className="text-xl">Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Destaque seus serviços como fornecedor e alcance mais clientes
              </p>
              <Button className="w-full bg-iparty hover:bg-iparty/90">
                Promover Fornecedor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Promote;
