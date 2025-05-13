import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
    paymentBrickController: any;
    bricksBuilder: any;
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
  const [showPaymentBrick, setShowPaymentBrick] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Use the proper toast hook from shadcn
  const { addToast } = useToast();
  
  // Function to show toast messages
  const showToast = (props: { title?: string; description: string; variant?: "default" | "destructive" }) => {
    addToast(props);
  };
  
  // Get user ID and Mercado Pago public key on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        }
        
        // Fetch Mercado Pago public key from edge function
        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        
        if (error) {
          console.error("Error fetching Mercado Pago public key:", error);
          showToast({
            title: "Erro",
            description: "Erro ao obter chave de pagamento",
            variant: "destructive"
          });
          setErrorMessage("Não foi possível se conectar ao serviço de pagamento. Tente novamente mais tarde.");
          return;
        }
        
        if (mpKeyData && mpKeyData.public_key) {
          setMercadoPagoPublicKey(mpKeyData.public_key);
        } else {
          console.error("Public key not found in response");
          setErrorMessage("Configuração de pagamento incompleta");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Erro ao inicializar o checkout");
      }
    };
    
    initialize();
  }, []);
  
  // Load Mercado Pago SDK
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    if (!window.MercadoPago) {
      script = document.createElement('script');
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        setSdkReady(true);
        console.log("Mercado Pago SDK loaded successfully");
      };
      script.onerror = () => {
        showToast({
          title: "Erro",
          description: "Erro ao carregar o Mercado Pago",
          variant: "destructive"
        });
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    } else {
      setSdkReady(true);
    }
    
    return () => {
      // Cleanup if component unmounts
      cleanupMercadoPago();
      
      // Remove the script if we created it
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Initialize Payment Brick when it's ready to be shown
  useEffect(() => {
    if (showPaymentBrick && sdkReady && mercadoPagoPublicKey && preferenceId) {
      const initializePaymentBrick = async () => {
        try {
          const mp = new window.MercadoPago(mercadoPagoPublicKey, {
            locale: 'pt-BR'
          });
          const bricksBuilder = mp.bricks();
          window.bricksBuilder = bricksBuilder;
          
          await renderPaymentBrick(bricksBuilder);
        } catch (error) {
          console.error("Error initializing Payment Brick:", error);
          setErrorMessage("Erro ao inicializar o formulário de pagamento");
        }
      };
      
      initializePaymentBrick();
    }
    
    return () => {
      // Cleanup when component unmounts or when we hide the brick
      if (window.paymentBrickController) {
        try {
          window.paymentBrickController.unmount();
        } catch (e) {
          console.error("Error unmounting Payment Brick:", e);
        }
      }
    };
  }, [showPaymentBrick, sdkReady, mercadoPagoPublicKey, preferenceId]);

  const handleShowCheckout = async () => {
    if (!sdkReady) {
      showToast({
        title: "Aguarde",
        description: "Mercado Pago ainda está carregando. Por favor, aguarde."
      });
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        showToast({
          title: "Erro",
          description: "Você precisa estar logado para realizar um pagamento.",
          variant: "destructive"
        });
        return;
      }
      setUserId(data.session.user.id);
    }
    
    // Check if we have the public key
    if (!mercadoPagoPublicKey) {
      showToast({
        title: "Erro",
        description: "Chave de pagamento não disponível. Tente novamente mais tarde.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Create a payment preference
      const { data: preferenceData, error: preferenceError } = await supabase.functions.invoke('create-payment-preference', {
        body: JSON.stringify({
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          amount: plan.price,
          description: `Promoção para ${spaceName}: ${plan.name}`
        })
      });
      
      if (preferenceError) {
        throw new Error(`Erro ao criar preferência de pagamento: ${preferenceError.message}`);
      }
      
      if (!preferenceData || !preferenceData.id) {
        throw new Error("Não foi possível criar a preferência de pagamento.");
      }
      
      // Set the preference ID and show the payment form
      setPreferenceId(preferenceData.id);
      setShowPaymentBrick(true);
      
      // Start checking for payment status
      startPaymentStatusCheck(preferenceData.id);
      
    } catch (error) {
      console.error("Checkout error:", error);
      showToast({
        title: "Erro",
        description: "Erro ao iniciar o checkout. Tente novamente.",
        variant: "destructive"
      });
      
      setErrorMessage("Não foi possível iniciar o checkout. Por favor, tente novamente mais tarde.");
      
      if (onError) {
        onError();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const startPaymentStatusCheck = (paymentId: string) => {
    if (!paymentId || !userId) return;
    
    // Check payment status every 10 seconds
    const statusInterval = setInterval(async () => {
      try {
        // Check payment status in database
        const { data: promotionData, error } = await supabase
          .from("space_promotions")
          .select("payment_status")
          .or(`payment_id.eq.${paymentId},preference_id.eq.${paymentId}`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (error) {
          console.error("Error checking payment status:", error);
          return;
        }
        
        if (promotionData && promotionData.length > 0) {
          const status = promotionData[0].payment_status;
          setPaymentStatus(status);
          
          // If payment is approved, call onSuccess and clear interval
          if (status === 'approved') {
            if (onSuccess) {
              onSuccess();
            }
            clearInterval(statusInterval);
          }
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      }
    }, 10000);
    
    // Clear interval after 15 minutes (max time to wait for payment)
    setTimeout(() => {
      clearInterval(statusInterval);
    }, 15 * 60 * 1000);
    
    // Return cleanup function
    return () => {
      clearInterval(statusInterval);
    };
  };
  
  const renderPaymentBrick = async (bricksBuilder: any) => {
    if (!preferenceId) {
      console.error("Preference ID is missing");
      return;
    }
    
    try {
      const settings = {
        initialization: {
          amount: plan.price,
          preferenceId: preferenceId,
        },
        customization: {
          paymentMethods: {
            ticket: "all",
            bankTransfer: "all",
            creditCard: "all",
            prepaidCard: "all",
            debitCard: "all",
            mercadoPago: "all",
          },
          visual: {
            hideFormTitle: true,
            hidePaymentButton: false,
          },
        },
        callbacks: {
          onReady: () => {
            console.log("Payment Brick is ready");
            setLoading(false);
          },
          onSubmit: async ({ selectedPaymentMethod, formData }: { selectedPaymentMethod: string, formData: any }) => {
            // Set processing state
            setProcessingPayment(true);
            
            try {
              console.log("Payment submitted:", selectedPaymentMethod, formData);
              
              // Process payment through our edge function
              const { data, error } = await supabase.functions.invoke('process-payment', {
                body: JSON.stringify({
                  ...formData,
                  space_id: spaceId,
                  plan_id: plan.id,
                  user_id: userId,
                  preference_id: preferenceId,
                  payment_type: selectedPaymentMethod
                })
              });
              
              if (error) {
                throw new Error(`Error processing payment: ${error.message}`);
              }
              
              if (!data || !data.success) {
                throw new Error(data?.error || "Unknown error processing payment");
              }
              
              // Set payment status
              setPaymentStatus(data.status);
              
              // Show success message
              if (data.status === 'approved') {
                toast({
                  title: "Sucesso",
                  description: "Pagamento aprovado com sucesso!"
                });
                if (onSuccess) {
                  onSuccess();
                }
              } else {
                toast({
                  title: "Informação",
                  description: `Pagamento em processamento. Status: ${data.status}`
                });
              }
              
              return { status: "success" };
            } catch (error) {
              console.error("Error processing payment:", error);
              toast({
                title: "Erro",
                description: "Erro ao processar pagamento. Por favor, tente novamente."
              });
              
              if (onError) {
                onError();
              }
              
              return { status: "error" };
            } finally {
              setProcessingPayment(false);
            }
          },
          onError: (error: any) => {
            console.error("Payment Brick error:", error);
            setErrorMessage(`Erro no processamento: ${error.message || "Erro desconhecido"}`);
          },
        },
      };
      
      // Create Payment Brick
      window.paymentBrickController = await bricksBuilder.create(
        "payment",
        "paymentBrick_container",
        settings
      );
    } catch (error) {
      console.error("Error rendering Payment Brick:", error);
      setErrorMessage("Erro ao carregar o formulário de pagamento");
    }
  };
  
  // Helper function to clean up Mercado Pago elements
  const cleanupMercadoPago = () => {
    // Unmount Payment Brick if it exists
    if (window.paymentBrickController) {
      try {
        window.paymentBrickController.unmount();
      } catch (e) {
        console.error("Error unmounting Payment Brick:", e);
      }
    }
    
    // Remove any hidden inputs that Mercado Pago might have added
    const hiddenInputs = document.querySelectorAll('[id^="MPHidden"]');
    hiddenInputs.forEach((element) => {
      element.remove();
    });
    
    // Remove any iframes that Mercado Pago might have created
    const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
    mpIframes.forEach((iframe) => {
      iframe.remove();
    });
    
    // Remove any styles that might have been added
    const formStyles = document.getElementById('mp-form-styles');
    if (formStyles) {
      formStyles.remove();
    }
    
    // Remove any overlay elements that might have been created
    const overlays = document.querySelectorAll('.mercadopago-overlay');
    overlays.forEach((element) => {
      element.remove();
    });
  };

  return (
    <div className="flex flex-col w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro no processamento</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {paymentStatus && paymentStatus !== "approved" && (
        <Alert className="mb-4">
          <AlertTitle>Status do Pagamento</AlertTitle>
          <AlertDescription>
            Seu pagamento está com status: {paymentStatus}. 
            {paymentStatus === "in_process" || paymentStatus === "pending" 
              ? " Aguarde a confirmação." 
              : " Entre em contato com o suporte se precisar de ajuda."}
          </AlertDescription>
        </Alert>
      )}
      
      {!showPaymentBrick ? (
        <Button 
          size="lg"
          onClick={handleShowCheckout}
          disabled={loading || !sdkReady || !mercadoPagoPublicKey}
          className="bg-iparty"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando formulário de pagamento...
            </>
          ) : !mercadoPagoPublicKey ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando configurações de pagamento...
            </>
          ) : (
            <>
              <Check size={20} className="mr-2" />
              Continuar para o pagamento
            </>
          )}
        </Button>
      ) : (
        <div className="w-full">
          <div id="paymentBrick_container" className="w-full"></div>
        </div>
      )}
    </div>
  );
};

export default MercadoPagoCheckout;
