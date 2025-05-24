import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Gera/recupera um Device ID persistido em localStorage
function getDeviceId(): string {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

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
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  
  // Get user ID and Mercado Pago public key on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing MercadoPago checkout...");
        
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
          console.log("User ID set:", data.session.user.id);
        } else {
          setErrorMessage("Você precisa estar logado para realizar um pagamento.");
          return;
        }
        
        // Fetch Mercado Pago public key from edge function
        console.log("Fetching Mercado Pago public key...");
        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        
        if (error) {
          console.error("Error fetching Mercado Pago public key:", error);
          setErrorMessage("Erro ao obter chave de pagamento. Verifique sua conexão e tente novamente.");
          return;
        }
        
        if (mpKeyData && mpKeyData.public_key) {
          setMercadoPagoPublicKey(mpKeyData.public_key);
          console.log("Mercado Pago public key received");
        } else {
          console.error("Public key not found in response:", mpKeyData);
          setErrorMessage("Configuração de pagamento incompleta. Entre em contato com o suporte.");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Erro ao inicializar o checkout. Tente recarregar a página.");
      }
    };
    
    initialize();
  }, []);
  
  // Load Mercado Pago SDK
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    const loadSDK = () => {
      if (!window.MercadoPago && !document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
        console.log("Loading Mercado Pago SDK...");
        script = document.createElement('script');
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => {
          console.log("Mercado Pago SDK loaded successfully");
          setSdkReady(true);
        };
        script.onerror = () => {
          console.error("Failed to load Mercado Pago SDK");
          setErrorMessage("Erro ao carregar o sistema de pagamento. Verifique sua conexão com a internet.");
        };
        document.body.appendChild(script);
      } else if (window.MercadoPago) {
        console.log("Mercado Pago SDK already available");
        setSdkReady(true);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(loadSDK, 100);
    
    return () => {
      cleanupMercadoPagoElements();
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleShowCheckout = async () => {
    console.log("Show checkout button clicked");
    
    if (!sdkReady) {
      toast({
        title: "Aguarde",
        description: "Mercado Pago ainda está carregando. Tente novamente em alguns segundos.",
        variant: "default"
      });
      return;
    }
    
    if (!mercadoPagoPublicKey) {
      toast({
        title: "Erro",
        description: "Chave de pagamento não disponível. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para realizar um pagamento.",
          variant: "destructive"
        });
        return;
      }
      setUserId(data.session.user.id);
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Showing payment form...");
      setShowCheckoutForm(true);
      
      // Initialize the form after a small delay to ensure DOM is ready
      setTimeout(() => {
        initializePaymentForm();
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage("Não foi possível iniciar o checkout. Tente recarregar a página.");
      setLoading(false);
      
      if (onError) {
        onError();
      }
    }
  };
  
  const initializePaymentForm = () => {
    if (initializationAttempted) {
      console.log("Payment form already initialized");
      return;
    }
    
    try {
      console.log("Initializing payment form...");
      
      if (!mercadoPagoPublicKey) {
        setErrorMessage("Chave de pagamento não disponível");
        return;
      }
      
      if (!window.MercadoPago) {
        setErrorMessage("SDK do Mercado Pago não carregado");
        return;
      }
      
      setInitializationAttempted(true);
      
      const mp = new window.MercadoPago(mercadoPagoPublicKey);
      
      // Create styles for the form
      createFormStyles();
      
      // Create the payment form HTML
      const paymentFormContainer = document.getElementById('payment-form-container');
      if (!paymentFormContainer) {
        console.error("Payment form container not found");
        setErrorMessage("Erro interno: container do formulário não encontrado");
        return;
      }
      
      paymentFormContainer.innerHTML = createFormHTML();
      
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
            if (error) {
              console.warn("Form Mounted handling error: ", error);
              setErrorMessage("Erro ao carregar o formulário de pagamento");
              return;
            }
            console.log("Form mounted successfully");
          },
          onSubmit: async event => {
            event.preventDefault();
            await handleFormSubmit(cardForm);
          },
          onFetching: (resource) => {
            console.log("Fetching resource: ", resource);
            const progressBar = document.querySelector<HTMLProgressElement>(".progress-bar");
            if (progressBar) progressBar.removeAttribute("value");
            
            return () => {
              if (progressBar) progressBar.setAttribute("value", "0");
            };
          }
        },
      });
      
      console.log("Payment form initialized successfully");
    } catch (error) {
      console.error("Error initializing payment form:", error);
      setErrorMessage("Erro ao inicializar formulário de pagamento. Tente recarregar a página.");
      setInitializationAttempted(false);
    }
  };

  const handleFormSubmit = async (cardForm: any) => {
    if (processingPayment) return;
    
    setErrorMessage(null);
    setPaymentStatus(null);
    setProcessingPayment(true);
    
    const progressBar = document.querySelector<HTMLProgressElement>("#payment-progress");
    if (progressBar) progressBar.removeAttribute("value");

    try {
      const formData = cardForm.getCardFormData();
      console.log("Processing payment with form data");
      
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }
      
      // Gera/recupera o deviceId
      const deviceId = getDeviceId();

      // Process payment through Supabase Edge Function, enviando o deviceId no header
      const { data, error } = await supabase.functions.invoke('process-payment', {
        headers: { "X-Meli-Session-Id": deviceId },
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
          description: `Promoção do espaço: ${spaceName} - Plano ${plan.name}`
        })
      });
      
      if (error) {
        console.error("Payment function error:", error);
        throw new Error("Erro na comunicação com o servidor de pagamentos");
      }
      
      if (data && data.success) {
        setPaymentStatus(data.status);
        
        if (data.status === "approved") {
          toast({
            title: "Pagamento aprovado!",
            description: "Seu espaço foi promovido com sucesso.",
            variant: "default"
          });

          cleanupMercadoPagoElements();
          
          if (onSuccess) {
            onSuccess();
          }
        } else if (data.status === "in_process" || data.status === "pending") {
          toast({
            title: "Pagamento em processamento",
            description: "Aguarde a confirmação do pagamento.",
            variant: "default"
          });
          setErrorMessage("Seu pagamento está em análise. Você receberá uma confirmação em breve.");
        } else {
          toast({
            title: `Pagamento: ${data.status}`,
            description: "Verifique o status mais tarde.",
            variant: "default"
          });
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
      toast({
        title: "Erro no pagamento",
        description: errorMsg,
        variant: "destructive"
      });
      setErrorMessage(errorMsg);
      
      if (onError) {
        onError();
      }
    } finally {
      if (progressBar) progressBar.setAttribute("value", "0");
      setProcessingPayment(false);
    }
  };

  // … restante do componente (createFormStyles, createFormHTML, cleanupMercadoPagoElements, render) …
  
  const canShowButton = sdkReady && mercadoPagoPublicKey && userId && !errorMessage;

  return (
    <div className="flex flex-col w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
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
          disabled={loading || !canShowButton}
          className="bg-iparty hover:bg-iparty/90"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando formulário...
            </>
          ) : (
            <>
              <Check size={20} className="mr-2" />
              Continuar para o pagamento
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dados do Cartão de Crédito</h3>
          <div id="payment-form-container" className="mt-6"></div>
        </div>
      )}
    </div>
  );
};

export default MercadoPagoCheckout;
