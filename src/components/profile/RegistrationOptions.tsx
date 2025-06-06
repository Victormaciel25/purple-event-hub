
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Briefcase } from "lucide-react";

interface RegistrationOptionsProps {
  onBack: () => void;
}

const RegistrationOptions: React.FC<RegistrationOptionsProps> = ({ onBack }) => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-xl font-medium">Cadastrar</h2>
      </div>

      <div className="space-y-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/register-space")}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-iparty/10 p-3 rounded-full mr-4">
                <Home size={24} className="text-iparty" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Espaço</h3>
                <p className="text-muted-foreground text-sm">Cadastre um espaço para eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/register-vendor")}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-iparty/10 p-3 rounded-full mr-4">
                <Briefcase size={24} className="text-iparty" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Fornecedor</h3>
                <p className="text-muted-foreground text-sm">Cadastre um fornecedor de serviços</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationOptions;
