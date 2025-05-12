
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
  const [checkoutRendered, setCheckoutRendered] = useState(false);
  
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
      // Cleanup if component unmounts
      if (checkoutRendered) {
        const container = document.getElementById('cardPaymentBrick_container');
        if (container) {
          container.innerHTML = '';
        }
      }
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
      
      // Create card payment brick
      const bricksBuilder = mp.bricks();
      
      // Create preference object (in a real implementation, this would come from your backend)
      const preference = {
        items: [
          {
            id: plan.id,
            title: `${plan.name} para ${spaceName}`,
            description: `Plano ${plan.duration}`,
            quantity: 1,
            unit_price: plan.price
          }
        ],
        payer: {
          email: 'test_user_123456@testuser.com' // In production, this would be the user's email
        }
      };

      // Render card payment brick
      const renderCardPaymentBrick = async () => {
        const settings = {
          initialization: {
            amount: plan.price,
          },
          callbacks: {
            onReady: () => {
              // brick ready to use
              console.log("CardPaymentBrick ready");
              setLoading(false);
              setCheckoutRendered(true);
            },
            onSubmit: (cardFormData: any) => {
              // callback called on submit form
              console.log("CardPaymentBrick - Payment submitted:", cardFormData);
              
              // For test/demo purposes, we'll simulate a successful payment
              setTimeout(() => {
                toast.success(`Pagamento de ${formatPrice(plan.price)} realizado com sucesso!`, {
                  duration: 5000,
                });
                
                if (onSuccess) {
                  onSuccess();
                }
              }, 2000);

              return new Promise((resolve, reject) => {
                // In a real implementation, you would send cardFormData to your backend
                // and process the payment with Mercado Pago's API
                
                // For the demo, we'll resolve the promise after a delay
                setTimeout(resolve, 1500);
              });
            },
            onError: (error: any) => {
              // callback called for all error cases related to the brick
              console.error("CardPaymentBrick error:", error);
              toast.error("Erro ao processar o pagamento. Tente novamente.");
              
              if (onError) {
                onError();
              }
            }
          }
        };
        
        const cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
      };
      
      // Wait a moment then render the brick
      setTimeout(() => {
        renderCardPaymentBrick();
      }, 500);
      
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao iniciar o checkout. Tente novamente.");
      
      if (onError) {
        onError();
      }
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
    <div className="flex flex-col w-full">
      {!checkoutRendered ? (
        <Button 
          size="lg"
          onClick={handleCheckout}
          disabled={loading || !sdkReady}
          className="bg-iparty"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando formulário de pagamento...
            </>
          ) : (
            <>
              <Check size={20} className="mr-2" />
              Continuar para o pagamento
            </>
          )}
        </Button>
      ) : null}
      
      <div id="cardPaymentBrick_container" className="mt-6 min-h-[300px]"></div>
    </div>
  );
};

export default MercadoPagoCheckout;
