import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
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
  const [cardFormInstance, setCardFormInstance] = useState<any>(null);
  
  // Helper function to clean up Mercado Pago elements
  const cleanupMercadoPagoElements = () => {
    // Destroy existing card form instance if it exists
    if (cardFormInstance) {
      try {
        // Try to destroy the card form instance if it has a destroy method
        if (typeof cardFormInstance.destroy === 'function') {
          cardFormInstance.destroy();
        }
      } catch (error) {
        console.log("Could not destroy card form instance:", error);
      }
      setCardFormInstance(null);
    }
    
    // Force clear any MercadoPago instances from window object
    try {
      if (window.MercadoPago && window.MercadoPago._instances) {
        window.MercadoPago._instances = {};
      }
    } catch (error) {
      console.log("Could not clear MercadoPago instances:", error);
    }
    
    // Remove all Mercado Pago hidden inputs
    const hiddenInputs = document.querySelectorAll('[id^="MPHidden"]');
    hiddenInputs.forEach((element) => {
      element.remove();
    });
    
    // Remove all Mercado Pago iframes
    const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
    mpIframes.forEach((iframe) => {
      iframe.remove();
    });
    
    // Remove any Mercado Pago containers
    const mpContainers = document.querySelectorAll('[id*="mercadopago"]');
    mpContainers.forEach((container) => {
      if (container.id !== 'payment-form-container') {
        container.remove();
      }
    });
    
    // Remove form styles
    const formStyles = document.getElementById('mp-form-styles');
    if (formStyles) {
      formStyles.remove();
    }
    
    // Remove overlays
    const overlays = document.querySelectorAll('.mercadopago-overlay');
    overlays.forEach((element) => {
      element.remove();
    });
    
    // Clear form container
    const formContainer = document.getElementById('payment-form-container');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
    
    // Reset component states
    setInitializationAttempted(false);
    setShowCheckoutForm(false);
    setErrorMessage(null);
    setPaymentStatus(null);
  };
  
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
  
  // Load Mercado Pago SDK and cleanup on component mount/unmount
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    // Cleanup any existing Mercado Pago elements when component mounts
    cleanupMercadoPagoElements();
    
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
  }, []); // Empty dependency array ensures this only runs on mount/unmount

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
      
      // Clean up any existing elements before showing the form
      cleanupMercadoPagoElements();
      
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
      console.log("Payment form already initialized, forcing cleanup and restart");
      cleanupMercadoPagoElements();
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
      
      // Create a completely fresh MercadoPago instance
      const mp = new window.MercadoPago(mercadoPagoPublicKey, {
        locale: 'pt-BR'
      });
      
      // Create styles for the form
      createFormStyles();
      
      // Create the payment form HTML
      const paymentFormContainer = document.getElementById('payment-form-container');
      if (!paymentFormContainer) {
        console.error("Payment form container not found");
        setErrorMessage("Erro interno: container do formulário não encontrado");
        return;
      }
      
      // Generate unique form ID to avoid conflicts
      const uniqueFormId = `form-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      paymentFormContainer.innerHTML = createFormHTML(uniqueFormId);
      
      // Initialize Mercado Pago card form with unique IDs
      const cardForm = mp.cardForm({
        amount: plan.price.toString(),
        iframe: true,
        form: {
          id: uniqueFormId,
          cardNumber: {
            id: `${uniqueFormId}__cardNumber`,
            placeholder: "Número do cartão",
          },
          expirationDate: {
            id: `${uniqueFormId}__expirationDate`,
            placeholder: "MM/YY",
          },
          securityCode: {
            id: `${uniqueFormId}__securityCode`,
            placeholder: "Código de segurança",
          },
          cardholderName: {
            id: `${uniqueFormId}__cardholderName`,
            placeholder: "Titular do cartão",
          },
          issuer: {
            id: `${uniqueFormId}__issuer`,
            placeholder: "Banco emissor",
          },
          installments: {
            id: `${uniqueFormId}__installments`,
            placeholder: "Parcelas",
          },        
          identificationType: {
            id: `${uniqueFormId}__identificationType`,
            placeholder: "Tipo de documento",
          },
          identificationNumber: {
            id: `${uniqueFormId}__identificationNumber`,
            placeholder: "Número do documento",
          },
          cardholderEmail: {
            id: `${uniqueFormId}__cardholderEmail`,
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
            await handleFormSubmit(cardForm, mp);
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
      
      // Store the card form instance
      setCardFormInstance(cardForm);
      
      console.log("Payment form initialized successfully");
    } catch (error) {
      console.error("Error initializing payment form:", error);
      setErrorMessage("Erro ao inicializar formulário de pagamento. Tente recarregar a página.");
      setInitializationAttempted(false);
    }
  };

  const handleFormSubmit = async (cardForm: any, mp: any) => {
    if (processingPayment) return;
    
    setErrorMessage(null);
    setPaymentStatus(null);
    setProcessingPayment(true);
    
    const progressBar = document.querySelector<HTMLProgressElement>("#payment-progress");
    if (progressBar) progressBar.removeAttribute("value");

    try {
      if (!cardForm) {
        throw new Error("Instância do formulário inválida");
      }

      const formData = cardForm.getCardFormData();
      console.log("Form data extracted:", formData);
      
      // Extract device fingerprint using the correct method
      let deviceId = null;
      try {
        deviceId = mp.getDeviceFingerprint();
        console.log("Device fingerprint extracted:", deviceId);
      } catch (fingerprintError) {
        console.warn("Could not extract device fingerprint:", fingerprintError);
      }
      
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      // Get payer first name and last name from form
      const cardholderName = formData.cardholderName || '';
      const nameParts = cardholderName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log("Processing payment with extracted data:", {
        token: formData.token,
        cardholderName,
        firstName,
        lastName,
        deviceId
      });

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
          payer: {
            email: formData.cardholderEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: formData.identificationType,
              number: formData.identificationNumber
            }
          },
          device_id: deviceId,
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

  const createFormStyles = () => {
    // Remove any existing styles to avoid duplicates
    const existingStyles = document.getElementById('mp-form-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    const formStyles = document.createElement('style');
    formStyles.id = 'mp-form-styles';
    formStyles.textContent = `
      .form-checkout {
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
      
      .form-submit {
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
      
      .form-submit:hover:not(:disabled) {
        background-color: rgb(126, 34, 206);
      }
      
      .form-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        margin-top: 16px;
      }
    `;
    document.head.appendChild(formStyles);
  };

  const createFormHTML = (formId: string) => {
    return `
      <form id="${formId}" class="form-checkout">
        <div class="form-group">
          <label for="${formId}__cardNumber">Número do Cartão</label>
          <div id="${formId}__cardNumber" class="container"></div>
        </div>
        
        <div class="form-group">
          <label for="${formId}__cardholderName">Nome Completo do Titular</label>
          <input type="text" id="${formId}__cardholderName" class="form-control" placeholder="Nome e sobrenome" />
        </div>
        
        <div class="form-group">
          <label for="${formId}__cardholderEmail">E-mail</label>
          <input type="email" id="${formId}__cardholderEmail" class="form-control" />
        </div>
        
        <div style="display: flex; gap: 16px;">
          <div class="form-group" style="flex: 1;">
            <label for="${formId}__expirationDate">Data de Validade</label>
            <div id="${formId}__expirationDate" class="container"></div>
          </div>
          
          <div class="form-group" style="flex: 1;">
            <label for="${formId}__securityCode">CVV</label>
            <div id="${formId}__securityCode" class="container"></div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="${formId}__issuer">Banco Emissor</label>
          <select id="${formId}__issuer" class="form-control"></select>
        </div>
        
        <div class="form-group">
          <label for="${formId}__installments">Parcelas</label>
          <select id="${formId}__installments" class="form-control"></select>
        </div>
        
        <div style="display: flex; gap: 16px;">
          <div class="form-group" style="flex: 1;">
            <label for="${formId}__identificationType">Tipo de Documento</label>
            <select id="${formId}__identificationType" class="form-control"></select>
          </div>
          
          <div class="form-group" style="flex: 1;">
            <label for="${formId}__identificationNumber">Número do Documento</label>
            <input type="text" id="${formId}__identificationNumber" class="form-control" />
          </div>
        </div>
        
        <button type="submit" id="${formId}__submit" class="form-submit" ${processingPayment ? 'disabled' : ''}>
          ${processingPayment ? 'Processando...' : 'Pagar'}
        </button>
        <progress value="0" class="progress-bar" id="payment-progress">Carregando...</progress>
      </form>
    `;
  };

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
          ) : !sdkReady ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando sistema de pagamento...
            </>
          ) : !mercadoPagoPublicKey ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando configurações...
            </>
          ) : !userId ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Verificando autenticação...
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