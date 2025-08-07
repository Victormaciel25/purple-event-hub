import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

const LazyMercadoPagoCheckout: React.FC<CheckoutProps> = (props) => {
  const [CheckoutComponent, setCheckoutComponent] = useState<React.ComponentType<CheckoutProps> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [componentKey, setComponentKey] = useState(0);

  const loadComponent = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Force cleanup of any existing MercadoPago instances
      if (window.MercadoPago) {
        try {
          // Clear all instances
          if (window.MercadoPago._instances) {
            window.MercadoPago._instances = {};
          }
        } catch (e) {
          console.log("Cleanup attempted");
        }
      }

      // Remove all MercadoPago related elements
      document.querySelectorAll('[id^="MPHidden"], iframe[src*="mercadopago"], [id*="mercadopago"], .mercadopago-overlay').forEach(el => {
        if (el.id !== 'payment-form-container') {
          el.remove();
        }
      });

      // Dynamically import the component
      const { default: MercadoPagoCheckout } = await import('./MercadoPagoCheckout');
      
      // Force a new key to completely remount the component
      setComponentKey(prev => prev + 1);
      setCheckoutComponent(() => MercadoPagoCheckout);
    } catch (error) {
      console.error('Error loading MercadoPago component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCheckoutComponent(null);
    setComponentKey(prev => prev + 1);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      setCheckoutComponent(null);
    };
  }, []);

  if (!CheckoutComponent) {
    return (
      <div className="space-y-4">
        <Button 
          onClick={loadComponent}
          disabled={isLoading}
          className="w-full h-12 bg-iparty hover:bg-iparty-dark text-white font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Carregando formulário...
            </>
          ) : (
            `Pagar ${props.plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button 
        variant="outline" 
        onClick={handleReset}
        className="w-full"
      >
        Recarregar formulário
      </Button>
      <CheckoutComponent 
        key={componentKey}
        {...props}
      />
    </div>
  );
};

export default LazyMercadoPagoCheckout;