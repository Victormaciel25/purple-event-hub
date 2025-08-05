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
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Fornecedor
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu fornecedor e receba mais visualizações</p>
            </div>
          </div>
          <Card className="p-8 text-center shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-iparty border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-muted-foreground">Carregando seus fornecedores...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Fornecedor
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu fornecedor e receba mais visualizações</p>
            </div>
          </div>
          <Card className="p-8 text-center shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-iparty/10 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-iparty/20 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Nenhum fornecedor disponível</h3>
                <p className="text-muted-foreground">Você precisa ter fornecedores aprovados para promovê-los.</p>
              </div>
              <Button onClick={() => navigate("/register-vendor")} className="bg-iparty hover:bg-iparty-dark px-6 py-3">
                Cadastrar Novo Fornecedor
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Fornecedor
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu fornecedor e receba mais visualizações</p>
            </div>
          </div>
          <Card className="p-8 text-center shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  Pagamento realizado com sucesso!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Seu fornecedor "<span className="font-semibold text-foreground">{vendors.find(vendor => vendor.id === selectedVendor)?.name}</span>" 
                  foi promovido com o plano <span className="font-semibold text-foreground">{plans.find(plan => plan.id === selectedPlan)?.name}</span>.
                </p>
              </div>
              <Button onClick={() => navigate("/profile")} className="bg-iparty hover:bg-iparty-dark px-8 py-3">
                Voltar ao perfil
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container px-4 py-6 pb-20 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => navigate("/promote")} className="mr-3 hover:bg-secondary">
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
              Promover Fornecedor
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Destaque seu fornecedor e receba mais visualizações</p>
          </div>
        </div>

        {/* Vendor Selection */}
        <div className="mb-8">
          <Card className="p-6 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-iparty rounded-full"></div>
              Selecione um fornecedor para promover
            </h2>
            <Select 
              value={selectedVendor} 
              onValueChange={setSelectedVendor}
            >
              <SelectTrigger className="w-full h-12 border-2 hover:border-iparty/50 transition-colors">
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
          </Card>
        </div>

        {/* Plans Selection */}
        <div className="mb-8">
          <Card className="p-6 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-iparty rounded-full"></div>
              Escolha um plano de promoção
            </h2>
            <RadioGroup 
              value={selectedPlan} 
              onValueChange={setSelectedPlan}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`border-2 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedPlan === plan.id 
                      ? 'border-iparty bg-iparty/5 shadow-lg shadow-iparty/20' 
                      : 'border-border hover:border-iparty/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                        </div>
                        <p className="text-muted-foreground mb-3">{plan.description}</p>
                        <div className="mb-2">
                          <span className="font-bold text-2xl text-iparty">{formatPrice(plan.price)}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-secondary rounded-full">
                          <span className="text-sm font-medium">Duração: {plan.duration}</span>
                        </div>
                      </div>
                      <RadioGroupItem 
                        value={plan.id} 
                        id={plan.id} 
                        className="mt-2 h-5 w-5 border-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </Card>
        </div>

        {/* Payment Method */}
        <div className="mb-8">
          <Card className="p-6 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-iparty rounded-full"></div>
              Escolha a forma de pagamento
            </h2>

            <Tabs 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as "card" | "pix")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-secondary/50">
                <TabsTrigger value="card" className="flex items-center gap-2 h-10 font-medium">
                  <CreditCard size={18} />
                  <span>Cartão de Crédito</span>
                </TabsTrigger>
                <TabsTrigger value="pix" className="flex items-center gap-2 h-10 font-medium">
                  <QrCode size={18} />
                  <span>Pix</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="card" className="mt-0">
                <Card className="border-2 border-dashed border-iparty/30 bg-gradient-to-br from-iparty/5 to-transparent">
                  <CardContent className="pt-6">
                    <MercadoPagoCheckout 
                      spaceId={selectedVendor}
                      spaceName={vendors.find(vendor => vendor.id === selectedVendor)?.name || ""}
                      plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
                      onSuccess={handlePaymentSuccess}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="pix" className="mt-0">
                <Card className="border-2 border-dashed border-green-300 bg-gradient-to-br from-green-50/50 to-transparent">
                  <CardContent className="pt-6">
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PromoteVendor;
