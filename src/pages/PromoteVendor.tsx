import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Check, CreditCard, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MercadoPagoCheckout from "@/components/MercadoPagoCheckout";
import VendorPixPayment from "@/components/VendorPixPayment";

type Vendor = {
  id: string;
  name: string;
};

type Plan = {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
  recurring: boolean;
};

const plans: Plan[] = [
  {
    id: "daily",
    name: "Diário",
    duration: "1 dia",
    price: 5,
    description: "Destaque seu fornecedor por 1 dia.",
    recurring: false,
  },
  {
    id: "weekly",
    name: "Semanal",
    duration: "7 dias",
    price: 25,
    description: "Destaque seu fornecedor por 7 dias.",
    recurring: false,
  },
  {
    id: "monthly",
    name: "Mensal",
    duration: "30 dias", 
    price: 89,
    description: "Fique no topo por 30 dias.",
    recurring: false,
  },
];

const PromoteVendor: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("daily");
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserVendors();
  }, []);

  const fetchUserVendors = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para promover um fornecedor",
          variant: "destructive"
        });
        navigate("/");
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("name");
      
      if (error) throw error;
      
      setVendors(data || []);
      if (data && data.length > 0) {
        setSelectedVendor(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus fornecedores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setPaymentSuccess(true);
      
      toast({
        title: "Sucesso",
        description: "Pagamento realizado com sucesso!",
        variant: "default"
      });
      
      setTimeout(() => {
        navigate("/profile");
      }, 3000);
    } catch (error) {
      console.error("Error validating payment success:", error);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Fornecedor</h1>
        </div>
        <p className="text-center py-10">Carregando seus fornecedores...</p>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Fornecedor</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="mb-4">Você precisa ter fornecedores aprovados para promovê-los.</p>
          <Button onClick={() => navigate("/register-vendor")} className="bg-iparty">
            Cadastrar Novo Fornecedor
          </Button>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Fornecedor</h1>
        </div>
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pagamento realizado com sucesso!</h2>
            <p className="text-gray-600 mb-6">
              Seu fornecedor "{vendors.find(vendor => vendor.id === selectedVendor)?.name}" 
              foi promovido com o plano {plans.find(plan => plan.id === selectedPlan)?.name}.
            </p>
            <Button onClick={() => navigate("/profile")} className="bg-iparty">
              Voltar ao perfil
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center mb-6 bg-white">
        <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Promover Fornecedor</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Selecione um fornecedor para promover:</h2>
        <Select 
          value={selectedVendor} 
          onValueChange={setSelectedVendor}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um fornecedor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-3">Escolha um plano de promoção:</h2>
        <RadioGroup 
          value={selectedPlan} 
          onValueChange={setSelectedPlan}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`border-2 ${selectedPlan === plan.id ? 'border-iparty' : 'border-gray-200'} cursor-pointer hover:border-iparty/70 transition-colors`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                    <div className="mt-2">
                      <span className="font-bold text-xl">{formatPrice(plan.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Duração: {plan.duration}</p>
                  </div>
                  <RadioGroupItem 
                    value={plan.id} 
                    id={plan.id} 
                    className="mt-1 h-5 w-5"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-3">Escolha a forma de pagamento:</h2>

        <Tabs 
          value={paymentMethod} 
          onValueChange={(value) => setPaymentMethod(value as "card" | "pix")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard size={18} />
              <span>Cartão de Crédito</span>
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-2">
              <QrCode size={18} />
              <span>Pix</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="card" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <MercadoPagoCheckout 
                  spaceId={selectedVendor}
                  spaceName={vendors.find(vendor => vendor.id === selectedVendor)?.name || ""}
                  plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
                  onSuccess={handlePaymentSuccess}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pix" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <VendorPixPayment
                  vendorId={selectedVendor}
                  vendorName={vendors.find(vendor => vendor.id === selectedVendor)?.name || ""}
                  plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
                  onSuccess={handlePaymentSuccess}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PromoteVendor;
