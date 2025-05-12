
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { MERCADO_PAGO_CONFIG } from '@/config/app-config';

type CheckoutProps = {
  spaceId: string;
  spaceName: string;
  plan: {
    id: string;
    name: string;
    price: number;
    duration: string;
    recurring: boolean;
  };
  onSuccess?: () => void;
  onError?: () => void;
};

declare global {
  interface Window {
    MercadoPago: any;
  }
}

const MercadoPagoCheckout: React.FC<CheckoutProps> = ({ 
  spaceId, 
  spaceName, 
  plan,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  
  // Load Mercado Pago SDK
  useEffect(() => {
    if (!window.MercadoPago) {
      const script = document.createElement('script');
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        setSdkReady(true);
        console.log("Mercado Pago SDK loaded");
      };
      script.onerror = () => {
        toast.error("Erro ao carregar o Mercado Pago");
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    } else {
      setSdkReady(true);
    }
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleCheckout = async () => {
    if (!sdkReady) {
      toast.error("Mercado Pago ainda está carregando. Por favor, aguarde.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Initialize MercadoPago
      const mp = new window.MercadoPago(MERCADO_PAGO_CONFIG.PUBLIC_KEY);
      
      // In a real implementation, you would call your backend to create a preference
      // For this demo with test keys, we'll simulate a successful payment flow
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For test/demo purposes, we'll simulate success
      toast.success(`Pagamento de ${formatPrice(plan.price)} realizado com sucesso!`, {
        duration: 5000,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao processar o pagamento. Tente novamente.");
      
      if (onError) {
        onError();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Button 
      size="lg"
      onClick={handleCheckout}
      disabled={loading || !sdkReady}
      className="bg-iparty"
    >
      {loading ? (
        <>
          <Loader2 size={20} className="mr-2 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <Check size={20} className="mr-2" />
          Continuar para o pagamento
        </>
      )}
    </Button>
  );
};

export default MercadoPagoCheckout;
