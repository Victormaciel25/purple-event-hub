
import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
        initializePaymentForm();
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
  
  const initializePaymentForm = () => {
    try {
      if (!mercadoPagoPublicKey) {
        toast.error("Chave de pagamento não disponível");
        return;
      }
      
      const mp = new window.MercadoPago(mercadoPagoPublicKey);
      
      // Create the payment form HTML
      const paymentFormContainer = document.getElementById('payment-form-container');
      if (!paymentFormContainer) {
        console.error("Payment form container not found");
        return;
      }
      
      paymentFormContainer.innerHTML = `
        <form id="form-checkout" action="/process_payment" method="post">
          <div class="space-y-4">
            <div class="form-group">
              <label for="form-checkout__payerFirstName" class="block text-gray-700 text-sm font-medium mb-1">Nome</label>
              <input id="form-checkout__payerFirstName" name="payerFirstName" type="text" class="w-full p-2 border border-gray-300 rounded" required>
            </div>
            <div class="form-group">
              <label for="form-checkout__payerLastName" class="block text-gray-700 text-sm font-medium mb-1">Sobrenome</label>
              <input id="form-checkout__payerLastName" name="payerLastName" type="text" class="w-full p-2 border border-gray-300 rounded" required>
            </div>
            <div class="form-group">
              <label for="form-checkout__email" class="block text-gray-700 text-sm font-medium mb-1">E-mail</label>
              <input id="form-checkout__email" name="email" type="email" class="w-full p-2 border border-gray-300 rounded" required>
            </div>
            <div class="form-group">
              <label for="form-checkout__identificationType" class="block text-gray-700 text-sm font-medium mb-1">Tipo de documento</label>
              <select id="form-checkout__identificationType" name="identificationType" class="w-full p-2 border border-gray-300 rounded" required></select>
            </div>
            <div class="form-group">
              <label for="form-checkout__identificationNumber" class="block text-gray-700 text-sm font-medium mb-1">Número do documento</label>
              <input id="form-checkout__identificationNumber" name="identificationNumber" type="text" class="w-full p-2 border border-gray-300 rounded" required>
            </div>
            
            <div class="form-group">
              <div id="form-checkout__cardNumber" class="p-2 border border-gray-300 rounded"></div>
            </div>
            <div class="flex space-x-4">
              <div class="form-group w-1/2">
                <div id="form-checkout__expirationDate" class="p-2 border border-gray-300 rounded"></div>
              </div>
              <div class="form-group w-1/2">
                <div id="form-checkout__securityCode" class="p-2 border border-gray-300 rounded"></div>
              </div>
            </div>
            <div class="form-group">
              <select id="form-checkout__installments" name="installments" class="w-full p-2 border border-gray-300 rounded"></select>
            </div>
            
            <div class="form-group">
              <input type="hidden" name="transactionAmount" id="transactionAmount" value="${plan.price}">
              <input type="hidden" name="description" id="description" value="Promoção do espaço: ${spaceName}">
            </div>
            
            <button type="submit" id="form-checkout__submit" class="w-full bg-iparty text-white rounded-md py-2 px-4 font-medium hover:bg-purple-700 transition-colors">
              Pagar ${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </button>
          </div>
        </form>
        <progress value="0" class="progress-bar w-full h-1 mt-4" id="payment-progress">Carregando...</progress>
      `;

      // Initialize the identification types
      mp.getIdentificationTypes();
      
      // Handle form submission
      document.getElementById("form-checkout")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (processingPayment) return;
        setProcessingPayment(true);
        
        const progressBar = document.querySelector<HTMLProgressElement>("#payment-progress");
        if (progressBar) progressBar.removeAttribute("value");
        
        try {
          // Get form data
          const formData = new FormData(e.target as HTMLFormElement);
          const formDataObj: Record<string, any> = {};
          formData.forEach((value, key) => {
            formDataObj[key] = value;
          });
          
          if (!userId) {
            throw new Error("Usuário não identificado. Faça login novamente.");
          }

          // Process payment through Supabase Edge Function
          const { data, error } = await supabase.functions.invoke('process-payment', {
            body: JSON.stringify({
              payerFirstName: formDataObj.payerFirstName,
              payerLastName: formDataObj.payerLastName,
              email: formDataObj.email,
              identificationType: formDataObj.identificationType,
              identificationNumber: formDataObj.identificationNumber,
              transaction_amount: plan.price,
              space_id: spaceId,
              plan_id: plan.id,
              user_id: userId
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
              toast.success("Pagamento aprovado com sucesso!");

              // Clean up Mercado Pago elements after payment
              cleanupMercadoPagoElements();
              
              if (onSuccess) {
                onSuccess();
              }
            } else if (data.status === "in_process" || data.status === "pending") {
              toast.info("Pagamento em processamento. Aguarde a confirmação.");
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
      ) : null}
      
      <div id="payment-form-container" className="mt-6"></div>
    </div>
  );
};

export default MercadoPagoCheckout;
