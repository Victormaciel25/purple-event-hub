
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VendorPendingApproval = () => {
  const navigate = useNavigate();

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/user-vendors")}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold">Detalhes do Fornecedor</h1>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={32} className="text-yellow-600" />
            </div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Seu fornecedor foi cadastrado com sucesso e está aguardando aprovação da nossa equipe.
            </p>
            <p className="text-sm text-muted-foreground">
              Você será notificado assim que a análise for concluída. Este processo geralmente leva até 24 horas.
            </p>
            <div className="flex flex-col space-y-2 pt-4">
              <Button
                onClick={() => navigate("/user-vendors")}
                className="bg-iparty hover:bg-iparty/90"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar para Meus Fornecedores
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/profile")}
              >
                Ir para Perfil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorPendingApproval;
