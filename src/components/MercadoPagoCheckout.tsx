import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, CreditCard, QrCode } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import PixPayment from './PixPayment';
import { EDGE_FUNCTIONS } from '@/config/app-config';

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

type PaymentMethod = 'credit_card' | 'pix';

const MercadoPagoCheckout: React.FC<CheckoutProps> = ({ 
  spaceId, 
  spaceName, 
  plan,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('credit_card');
  const [pixPaymentData, setPixPaymentData] = useState<any>(null);
  const [pixLoading, setPixLoading] = useState(false);
  
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
          toast.error("Erro ao obter chave de pagamento");
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
        toast.error("Erro ao carregar o Mercado Pago");
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    } else {
      setSdkReady(true);
    }
    
    return () => {
      // Cleanup if component unmounts
      cleanupMercadoPagoElements();
      
      // Remove the script if we created it
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleShowCheckout = async () => {
    if (!sdkReady) {
      toast.error("Mercado Pago ainda está carregando. Por favor, aguarde.");
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Você precisa estar logado para realizar um pagamento.");
        return;
      }
      setUserId(data.session.user.id);
    }
    
    // Check if we have the public key
    if (!mercadoPagoPublicKey) {
      toast.error("Chave de pagamento não disponível. Tente novamente mais tarde.");
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Show the payment form
      setShowCheckoutForm(true);
      
      // Initialize the form after a small delay to ensure DOM is ready
      setTimeout(() => {
        if (activePaymentMethod === 'credit_card') {
          initializePaymentForm();
        }
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao iniciar o checkout. Tente novamente.");
      
      setErrorMessage("Não foi possível iniciar o checkout. Por favor, tente novamente mais tarde.");
      
      if (onError) {
        onError();
      }
      setLoading(false);
    }
  };

  const handleCreatePixPayment = async () => {
    if (!userId) {
      toast.error("Você precisa estar logado para realizar um pagamento.");
      return;
    }
    
    setPixLoading(true);
    setErrorMessage(null);
    
    try {
      // Get user's email
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email;
      
      if (!userEmail) {
        throw new Error("Não foi possível obter o email do usuário");
      }
      
      // Create PIX payment
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: JSON.stringify({
          payment_method_id: 'pix',
          transaction_amount: plan.price.toString(),
          email: userEmail,
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          description: `Promoção para ${spaceName}: ${plan.name}`,
          payment_type: 'pix'
        })
      });
      
      if (error) {
        throw new Error(`Erro ao processar pagamento: ${error.message}`);
      }
      
      if (!data || !data.success) {
        throw new Error(data?.error || "Erro desconhecido ao processar pagamento PIX");
      }
      
      // Set payment data
      setPixPaymentData(data.point_of_interaction?.transaction_data || {});
      setPaymentStatus(data.status);
      
      // Start checking for payment status
      if (data.status === 'pending') {
        startPaymentStatusCheck(data.payment_id);
      }
      
    } catch (error) {
      console.error("PIX payment error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erro ao processar pagamento PIX");
      if (onError) onError();
    } finally {
      setPixLoading(false);
    }
  };
  
  const startPaymentStatusCheck = (paymentId: string) => {
    if (!paymentId) return;
    
    // Check payment status every 10 seconds
    const statusInterval = setInterval(async () => {
      try {
        // Check payment status in database
        const { data: promotionData, error } = await supabase
          .from("space_promotions")
          .select("payment_status")
          .eq("payment_id", paymentId)
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
    
    // Clear interval after 15 minutes (max time to wait for PIX payment)
    setTimeout(() => {
      clearInterval(statusInterval);
    }, 15 * 60 * 1000);
    
    // Save interval ID for cleanup
    return () => {
      clearInterval(statusInterval);
    };
  };
  
  const initializePaymentForm = () => {
    try {
      if (!mercadoPagoPublicKey) {
        toast.error("Chave de pagamento não disponível");
        return;
      }
      
      const mp = new window.MercadoPago(mercadoPagoPublicKey);
      
      // Remove any existing styles to avoid duplicates
      const existingStyles = document.getElementById('mp-form-styles');
      if (existingStyles) {
        existingStyles.remove();
      }
      
      // Create styles for the form
      const formStyles = document.createElement('style');
      formStyles.id = 'mp-form-styles';
      formStyles.textContent = `
        #form-checkout {
          display: flex;
          flex-direction: column;
          max-width: 600px;
          gap: 16px;
          margin: 0 auto;
        }
        
        .container {
          height: 40px;
          display: block;
          border: 1px solid rgb(209, 213, 219);
          border-radius: 0.375rem;
          padding: 8px 12px;
          font-size: 16px;
          width: 100%;
          background-color: white;
        }
        
        .form-control {
          height: 40px;
          display: block;
          border: 1px solid rgb(209, 213, 219);
          border-radius: 0.375rem;
          padding: 8px 12px;
          font-size: 16px;
          width: 100%;
        }
        
        .form-group {
          margin-bottom: 12px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.7);
        }
        
        #form-checkout__submit {
          background-color: rgb(147, 51, 234);
          color: white;
          font-weight: 500;
          padding: 10px 16px;
          border-radius: 0.375rem;
          border: none;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.2s;
          margin-bottom: 0px;
        }
        
        #form-checkout__submit:hover {
          background-color: rgb(126, 34, 206);
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          margin-top: 16px;
        }
        
        /* Remove any overlays that Mercado Pago might create */
        .mercadopago-overlay {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(formStyles);
      
      // Create the payment form HTML
      const paymentFormContainer = document.getElementById('payment-form-container');
      if (!paymentFormContainer) {
        console.error("Payment form container not found");
        return;
      }
      
      paymentFormContainer.innerHTML = `
        <form id="form-checkout">
          <div class="form-group">
            <label for="form-checkout__cardNumber">Número do Cartão</label>
            <div id="form-checkout__cardNumber" class="container"></div>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__cardholderName">Titular do Cartão</label>
            <input type="text" id="form-checkout__cardholderName" class="form-control" />
          </div>
          
          <div class="form-group">
            <label for="form-checkout__cardholderEmail">E-mail</label>
            <input type="email" id="form-checkout__cardholderEmail" class="form-control" />
          </div>
          
          <div style="display: flex; gap: 16px;">
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__expirationDate">Data de Validade</label>
              <div id="form-checkout__expirationDate" class="container"></div>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__securityCode">CVV</label>
              <div id="form-checkout__securityCode" class="container"></div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__issuer">Banco Emissor</label>
            <select id="form-checkout__issuer" class="form-control"></select>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__installments">Parcelas</label>
            <select id="form-checkout__installments" class="form-control"></select>
          </div>
          
          <div style="display: flex; gap: 16px;">
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__identificationType">Tipo de Documento</label>
              <select id="form-checkout__identificationType" class="form-control"></select>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__identificationNumber">Número do Documento</label>
              <input type="text" id="form-checkout__identificationNumber" class="form-control" />
            </div>
          </div>
          
          <button type="submit" id="form-checkout__submit">Pagar</button>
          <progress value="0" class="progress-bar" id="payment-progress">Carregando...</progress>
        </form>
      `;
      
      // Initialize Mercado Pago card form
      const cardForm = mp.cardForm({
        amount: plan.price.toString(),
        iframe: true,
        form: {
          id: "form-checkout",
          cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Número do cartão",
          },
          expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YY",
          },
          securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Código de segurança",
          },
          cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Titular do cartão",
          },
          issuer: {
            id: "form-checkout__issuer",
            placeholder: "Banco emissor",
          },
          installments: {
            id: "form-checkout__installments",
            placeholder: "Parcelas",
          },        
          identificationType: {
            id: "form-checkout__identificationType",
            placeholder: "Tipo de documento",
          },
          identificationNumber: {
            id: "form-checkout__identificationNumber",
            placeholder: "Número do documento",
          },
          cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
          },
        },
        callbacks: {
          onFormMounted: error => {
            if (error) return console.warn("Form Mounted handling error: ", error);
            console.log("Form mounted");
          },
          onSubmit: async event => {
            event.preventDefault();
            
            if (processingPayment) return;
            setErrorMessage(null);
            setPaymentStatus(null);
            
            const progressBar = document.querySelector<HTMLProgressElement>("#payment-progress");
            if (progressBar) progressBar.removeAttribute("value");
            
            setProcessingPayment(true);

            try {
              const formData = cardForm.getCardFormData();
              console.log("Payment form data:", formData);
              
              if (!userId) {
                throw new Error("Usuário não identificado. Faça login novamente.");
              }

              // Process payment through Supabase Edge Function
              const { data, error } = await supabase.functions.invoke('process-payment', {
                body: JSON.stringify({
                  token: formData.token,
                  issuer_id: formData.issuerId,
                  payment_method_id: formData.paymentMethodId,
                  transaction_amount: formData.amount,
                  installments: formData.installments,
                  email: formData.cardholderEmail,
                  identification: {
                    type: formData.identificationType,
                    number: formData.identificationNumber
                  },
                  space_id: spaceId,
                  plan_id: plan.id,
                  user_id: userId,
                  payment_type: 'credit_card'
                })
              });
              
              if (error) {
                console.error("Payment function error:", error);
                throw new Error("Erro na comunicação com o servidor de pagamentos");
              }
              
              if (data && data.success) {
                // Store payment status
                setPaymentStatus(data.status);
                
                // Only call onSuccess if payment status is "approved"
                if (data.status === "approved") {
                  toast.success(`Pagamento aprovado com sucesso!`, {
                    duration: 5000,
                  });

                  // Clean up Mercado Pago elements after payment
                  cleanupMercadoPagoElements();
                  
                  if (onSuccess) {
                    onSuccess();
                  }
                } else if (data.status === "in_process" || data.status === "pending") {
                  toast.info(`Pagamento em processamento. Aguarde a confirmação.`, {
                    duration: 5000,
                  });
                  setErrorMessage("Seu pagamento está em análise. Você receberá uma confirmação em breve.");
                } else {
                  // Handle other statuses
                  toast.warning(`Status do pagamento: ${data.status}. Verifique mais tarde.`);
                  setErrorMessage(`Pagamento registrado com status: ${data.status}`);
                }
              } else {
                const errorMsg = data?.error || "Ocorreu um erro ao processar o pagamento.";
                setErrorMessage(errorMsg);
                throw new Error(errorMsg);
              }
            } catch (error) {
              console.error("Payment processing error:", error);
              
              const errorMsg = error instanceof Error ? error.message : "Erro ao processar pagamento. Verifique os dados do cartão.";
              toast.error(errorMsg);
              setErrorMessage(errorMsg);
              
              if (onError) {
                onError();
              }
            } finally {
              if (progressBar) progressBar.setAttribute("value", "0");
              setProcessingPayment(false);
            }
          },
          onFetching: (resource) => {
            console.log("Fetching resource: ", resource);
            
            // Animate progress bar
            const progressBar = document.querySelector<HTMLProgressElement>(".progress-bar");
            if (progressBar) progressBar.removeAttribute("value");
            
            return () => {
              if (progressBar) progressBar.setAttribute("value", "0");
            };
          }
        },
      });
    } catch (error) {
      console.error("Error initializing payment form:", error);
      toast.error("Erro ao inicializar formulário de pagamento");
      setErrorMessage("Não foi possível carregar o formulário de pagamento. Por favor, tente novamente mais tarde.");
    }
  };
  
  // Helper function to clean up Mercado Pago elements
  const cleanupMercadoPagoElements = () => {
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
    
    // Reset the payment form container
    const formContainer = document.getElementById('payment-form-container');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
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
      
      {!showCheckoutForm ? (
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
        <Tabs defaultValue="credit_card" className="w-full" onValueChange={(value) => setActivePaymentMethod(value as PaymentMethod)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credit_card" className="flex items-center gap-2">
              <CreditCard size={16} />
              Cartão de Crédito
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-2">
              <QrCode size={16} />
              PIX
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="credit_card" className="mt-4">
            <div id="payment-form-container" className="mt-2"></div>
          </TabsContent>
          
          <TabsContent value="pix" className="mt-4">
            {!pixPaymentData ? (
              <Button 
                onClick={handleCreatePixPayment}
                disabled={pixLoading || !userId}
                className="w-full bg-iparty"
              >
                {pixLoading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode size={20} className="mr-2" />
                    Gerar código PIX
                  </>
                )}
              </Button>
            ) : (
              <PixPayment 
                paymentData={pixPaymentData}
                amount={plan.price}
                description={`Promoção para ${spaceName}: ${plan.name}`}
                isLoading={pixLoading}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MercadoPagoCheckout;
