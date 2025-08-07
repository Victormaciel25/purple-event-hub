import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Check, CreditCard, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LazyMercadoPagoCheckout from "@/components/LazyMercadoPagoCheckout";
import PixPayment from "@/components/PixPayment";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";

type Space = {
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
    price: 7,
    description: "Destaque seu espaço por 1 dia.",
    recurring: false,
  },
  {
    id: "weekly",
    name: "Semanal",
    duration: "7 dias",
    price: 33,
    description: "Destaque seu espaço por 7 dias.",
    recurring: false,
  },
  {
    id: "monthly",
    name: "Mensal",
    duration: "30 dias", 
    price: 126,
    description: "Fique no topo por 30 dias.",
    recurring: false,
  },
  {
    id: "monthly-recurring",
    name: "Mensal recorrente",
    duration: "Todos os meses",
    price: 99,
    description: "Fique no topo todos os dias.",
    recurring: true,
  },
];

const PromoteSpace: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("daily");
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [checkoutKey, setCheckoutKey] = useState<number>(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserSpaces();
    
    // Cleanup function for when component unmounts
    return () => {
      // Remove any Mercado Pago elements that might be left over
      const mpElements = document.querySelectorAll('[id^="MPHidden"]');
      mpElements.forEach(element => {
        element.remove();
      });
      
      // Remove any styles that might have been added
      const formStyles = document.getElementById('mp-form-styles');
      if (formStyles) {
        formStyles.remove();
      }
      
      // Remove any iframes that Mercado Pago might have created
      const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
      mpIframes.forEach(iframe => {
        iframe.remove();
      });
      
      // Remove any overlay elements
      const overlays = document.querySelectorAll('.mercadopago-overlay');
      overlays.forEach(element => {
        element.remove();
      });
    };
  }, []);

  const fetchUserSpaces = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para promover um espaço",
          variant: "destructive"
        });
        navigate("/");
        return;
      }
      
      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("name");
      
      if (error) throw error;
      
      setSpaces(data || []);
      if (data && data.length > 0) {
        setSelectedSpace(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar espaços:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus espaços",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset payment method to card when monthly-recurring plan is selected
  useEffect(() => {
    if (selectedPlan === "monthly-recurring") {
      setPaymentMethod("card");
    }
  }, [selectedPlan]);

  // This will only be called when payment is confirmed and approved by Mercado Pago
  const handlePaymentSuccess = async () => {
    // Verify payment status in database before showing success screen
    try {
      // Check for an approved payment in the database to confirm
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error("No active session found");
        return;
      }

      const userId = sessionData.session.user.id;
      
      // Query the space_promotions table for this space and verify it's active
      const { data: promotionData, error } = await supabase
        .from("space_promotions")
        .select("payment_status")
        .eq("space_id", selectedSpace)
        .eq("user_id", userId)
        .eq("plan_id", selectedPlan)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error verifying payment status:", error);
        return;
      }

      // Only show success if we have a confirmed payment record in database
      if (promotionData && promotionData.length > 0 && promotionData[0].payment_status === "approved") {
        setPaymentSuccess(true);
        
        // Redirect to profile after a delay
        setTimeout(() => {
          navigate("/profile");
        }, 3000);
      } else {
        toast({
          title: "Atenção",
          description: "Aguardando confirmação de pagamento do processador",
          variant: "default"
        });
      }
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

  const isRecurringPlan = selectedPlan === "monthly-recurring";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Espaço
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu espaço e receba mais visualizações</p>
            </div>
          </div>
          <Card className="p-8 text-center shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-iparty border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-muted-foreground">Carregando seus espaços...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
        <div className="container px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Espaço
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu espaço e receba mais visualizações</p>
            </div>
          </div>
          <Card className="p-8 text-center shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-iparty/10 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-iparty/20 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Nenhum espaço disponível</h3>
                <p className="text-muted-foreground">Você precisa ter espaços aprovados para promovê-los.</p>
              </div>
              <Button onClick={() => navigate("/register-space")} className="bg-iparty hover:bg-iparty-dark px-6 py-3">
                Cadastrar Novo Espaço
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-3 hover:bg-secondary">
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
                Promover Espaço
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Destaque seu espaço e receba mais visualizações</p>
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
                  Seu espaço "<span className="font-semibold text-foreground">{spaces.find(space => space.id === selectedSpace)?.name}</span>" 
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-3 hover:bg-secondary">
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-iparty to-iparty-dark bg-clip-text text-transparent">
              Promover Espaço
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Destaque seu espaço e receba mais visualizações</p>
          </div>
        </div>

        {/* Space Selection */}
        <div className="mb-8">
          <Card className="p-6 shadow-md border-0 bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-iparty rounded-full"></div>
              Selecione um espaço para promover
            </h2>
            <Select 
              value={selectedSpace} 
              onValueChange={setSelectedSpace}
            >
              <SelectTrigger className="w-full h-12 border-2 hover:border-iparty/50 transition-colors">
                <SelectValue placeholder="Selecione um espaço" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
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
                          {plan.recurring && (
                            <div className="px-2 py-1 bg-iparty/10 text-iparty text-xs rounded-full font-medium">
                              Recorrente
                            </div>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{plan.description}</p>
                        <div className="mb-2">
                          <span className="font-bold text-2xl text-iparty">{formatPrice(plan.price)}</span>
                          {plan.recurring && <span className="text-sm text-muted-foreground ml-1">/mês</span>}
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
            
            {isRecurringPlan && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Para planos recorrentes, apenas pagamento por cartão de crédito está disponível.
                  </p>
                </div>
              </div>
            )}

            <Tabs 
              value={paymentMethod} 
              onValueChange={(value) => {
                setPaymentMethod(value as "card" | "pix");
                // Force recreation of MercadoPago component when switching to card
                if (value === "card") {
                  setCheckoutKey(Date.now());
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-secondary/50">
                <TabsTrigger value="card" className="flex items-center gap-2 h-10 font-medium">
                  <CreditCard size={18} />
                  <span>Cartão de Crédito</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pix" 
                  className="flex items-center gap-2 h-10 font-medium"
                  disabled={isRecurringPlan}
                >
                  <QrCode size={18} />
                  <span>Pix</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="card" className="mt-0">
                <Card className="border-2 border-dashed border-iparty/30 bg-gradient-to-br from-iparty/5 to-transparent">
                  <CardContent className="pt-6">
                    {isRecurringPlan ? (
                      <SubscriptionCheckout 
                        spaceId={selectedSpace}
                        spaceName={spaces.find(space => space.id === selectedSpace)?.name || ""}
                        plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
                        onSuccess={handlePaymentSuccess}
                      />
                    ) : (
                      <LazyMercadoPagoCheckout 
                        spaceId={selectedSpace}
                        spaceName={spaces.find(space => space.id === selectedSpace)?.name || ""}
                        plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
                        onSuccess={handlePaymentSuccess}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="pix" className="mt-0">
                <Card className="border-2 border-dashed border-green-300 bg-gradient-to-br from-green-50/50 to-transparent">
                  <CardContent className="pt-6">
                    <PixPayment
                      spaceId={selectedSpace}
                      spaceName={spaces.find(space => space.id === selectedSpace)?.name || ""}
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

export default PromoteSpace;
