
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MercadoPagoCheckout from "@/components/MercadoPagoCheckout";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Function to show toast messages
  const showToast = (props: { title?: string; description: string; variant?: "default" | "destructive" }) => {
    if (props.variant === "destructive") {
      toast({
        variant: "destructive",
        description: props.description,
      });
    } else if (props.title === "Sucesso") {
      toast({
        description: props.description,
      });
    } else {
      toast({
        description: props.description,
      });
    }
  };

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
        showToast({
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
      showToast({
        title: "Erro",
        description: "Erro ao carregar seus espaços",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
        showToast({
          title: "Aguardando",
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

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Espaço</h1>
        </div>
        <p className="text-center py-10">Carregando seus espaços...</p>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Espaço</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="mb-4">Você precisa ter espaços aprovados para promovê-los.</p>
          <Button onClick={() => navigate("/register-space")} className="bg-iparty">
            Cadastrar Novo Espaço
          </Button>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Promover Espaço</h1>
        </div>
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pagamento realizado com sucesso!</h2>
            <p className="text-gray-600 mb-6">
              Seu espaço "{spaces.find(space => space.id === selectedSpace)?.name}" 
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mr-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Promover Espaço</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Selecione um espaço para promover:</h2>
        <Select 
          value={selectedSpace} 
          onValueChange={setSelectedSpace}
        >
          <SelectTrigger className="w-full">
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
                      {plan.recurring && <span className="text-sm text-muted-foreground">/mês</span>}
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

      <div className="flex justify-center">
        <MercadoPagoCheckout 
          spaceId={selectedSpace}
          spaceName={spaces.find(space => space.id === selectedSpace)?.name || ""}
          plan={plans.find(plan => plan.id === selectedPlan) || plans[0]}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
};

export default PromoteSpace;
