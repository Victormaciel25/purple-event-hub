import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type SubscriptionCheckoutProps = {
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

const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps> = ({ 
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
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const [cardFormInstance, setCardFormInstance] = useState<any>(null);
  
  // Get user ID and Mercado Pago public key on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing Subscription checkout...");
        
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
          console.log("User ID set:", data.session.user.id);
        } else {
          setErrorMessage("Você precisa estar logado para realizar uma assinatura.");
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

    setTimeout(loadSDK, 100);
    
    return () => {
      cleanupMercadoPagoElements();
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleShowCheckout = async () => {
    console.log("Show subscription checkout button clicked");
    
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
    
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para realizar uma assinatura.",
          variant: "destructive"
        });
        return;
      }
      setUserId(data.session.user.id);
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Showing subscription payment form...");
      setShowCheckoutForm(true);
      
      setTimeout(() => {
        initializePaymentForm();
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Subscription checkout error:", error);
      setErrorMessage("Não foi possível iniciar o checkout de assinatura. Tente recarregar a página.");
      setLoading(false);
      
      if (onError) {
        onError();
      }
    }
  };
  
  const initializePaymentForm = () => {
    if (initializationAttempted) {
      console.log("Subscription payment form already initialized");
      return;
    }
    
    try {
      console.log("Initializing subscription payment form...");
      
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
      
      createFormStyles();
      
      const paymentFormContainer = document.getElementById('subscription-form-container');
      if (!paymentFormContainer) {
        console.error("Subscription form container not found");
        setErrorMessage("Erro interno: container do formulário não encontrado");
        return;
      }
      
      paymentFormContainer.innerHTML = createFormHTML();
      
      const cardForm = mp.cardForm({
        amount: plan.price.toString(),
        iframe: true,
        form: {
          id: "subscription-form-checkout",
          cardNumber: {
            id: "subscription-form-checkout__cardNumber",
            placeholder: "Número do cartão",
          },
          expirationDate: {
            id: "subscription-form-checkout__expirationDate",
            placeholder: "MM/YY",
          },
          securityCode: {
            id: "subscription-form-checkout__securityCode",
            placeholder: "Código de segurança",
          },
          cardholderName: {
            id: "subscription-form-checkout__cardholderName",
            placeholder: "Titular do cartão",
          },
          issuer: {
            id: "subscription-form-checkout__issuer",
            placeholder: "Banco emissor",
          },
          installments: {
            id: "subscription-form-checkout__installments",
            placeholder: "Parcelas",
          },        
          identificationType: {
            id: "subscription-form-checkout__identificationType",
            placeholder: "Tipo de documento",
          },
          identificationNumber: {
            id: "subscription-form-checkout__identificationNumber",
            placeholder: "Número do documento",
          },
          cardholderEmail: {
            id: "subscription-form-checkout__cardholderEmail",
            placeholder: "E-mail",
          },
        },
        callbacks: {
          onFormMounted: error => {
            if (error) {
              console.warn("Subscription Form Mounted handling error: ", error);
              setErrorMessage("Erro ao carregar o formulário de assinatura");
              return;
            }
            console.log("Subscription form mounted successfully");
          },
          onSubmit: async event => {
            event.preventDefault();
            await handleFormSubmit(cardForm, mp);
          },
          onFetching: (resource) => {
            console.log("Fetching resource: ", resource);
            const progressBar = document.querySelector<HTMLProgressElement>(".subscription-progress-bar");
            if (progressBar) progressBar.removeAttribute("value");
            
            return () => {
              if (progressBar) progressBar.setAttribute("value", "0");
            };
          }
        },
      });
      
      setCardFormInstance(cardForm);
      
      console.log("Subscription payment form initialized successfully");
    } catch (error) {
      console.error("Error initializing subscription payment form:", error);
      setErrorMessage("Erro ao inicializar formulário de assinatura. Tente recarregar a página.");
      setInitializationAttempted(false);
    }
  };

  const handleFormSubmit = async (cardForm: any, mp: any) => {
    if (processingPayment) return;
    
    setErrorMessage(null);
    setProcessingPayment(true);
    
    const progressBar = document.querySelector<HTMLProgressElement>("#subscription-payment-progress");
    if (progressBar) progressBar.removeAttribute("value");

    try {
      if (!cardForm) {
        throw new Error("Instância do formulário inválida");
      }

      const formData = cardForm.getCardFormData();
      console.log("Subscription form data extracted:", formData);
      
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

      const cardholderName = formData.cardholderName || '';
      const nameParts = cardholderName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log("Processing subscription with extracted data:", {
        token: formData.token,
        cardholderName,
        firstName,
        lastName,
        deviceId
      });

      // Calculate subscription start date (no end date for unlimited subscription)
      const subscriptionStart = new Date();

      // Process subscription through Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: JSON.stringify({
          reason: `Assinatura mensal - Promoção do espaço: ${spaceName}`,
          amount: plan.price,
          currency: "BRL",
          frequency: 1,
          frequency_type: "months",
          repetitions: 12,
          billing_day_proportional: true,
          back_url: window.location.origin + "/profile",
          external_reference: `space-${spaceId}-subscription`,
          payer_email: formData.cardholderEmail,
          card_token_id: formData.token,
          subscription_start: subscriptionStart.toISOString(),
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          payer: {
            email: formData.cardholderEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: formData.identificationType,
              number: formData.identificationNumber
            }
          },
          device_id: deviceId
        })
      });
      
      if (error) {
        console.error("Subscription function error:", error);
        throw new Error("Erro na comunicação com o servidor de assinaturas");
      }
      
      if (data && data.subscription) {
        toast({
          title: "Assinatura criada com sucesso!",
          description: "Sua assinatura mensal foi configurada. O primeiro pagamento será processado hoje.",
          variant: "default"
        });

        cleanupMercadoPagoElements();
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMsg = data?.error || "Ocorreu um erro ao criar a assinatura.";
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Subscription processing error:", error);
      
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar assinatura. Verifique os dados do cartão.";
      toast({
        title: "Erro na assinatura",
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
    const existingStyles = document.getElementById('subscription-form-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    const formStyles = document.createElement('style');
    formStyles.id = 'subscription-form-styles';
    formStyles.textContent = `
      #subscription-form-checkout {
        display: flex;
        flex-direction: column;
        max-width: 600px;
        gap: 16px;
        margin: 0 auto;
      }
      
      .subscription-container {
        height: 40px;
        display: block;
        border: 1px solid rgb(209, 213, 219);
        border-radius: 0.375rem;
        padding: 8px 12px;
        font-size: 16px;
        width: 100%;
        background-color: white;
      }
      
      .subscription-form-control {
        height: 40px;
        display: block;
        border: 1px solid rgb(209, 213, 219);
        border-radius: 0.375rem;
        padding: 8px 12px;
        font-size: 16px;
        width: 100%;
      }
      
      .subscription-form-group {
        margin-bottom: 12px;
      }
      
      .subscription-form-group label {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.7);
      }
      
      #subscription-form-checkout__submit {
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
      
      #subscription-form-checkout__submit:hover:not(:disabled) {
        background-color: rgb(126, 34, 206);
      }
      
      #subscription-form-checkout__submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .subscription-progress-bar {
        width: 100%;
        height: 8px;
        margin-top: 16px;
      }
    `;
    document.head.appendChild(formStyles);
  };

  const createFormHTML = () => {
    return `
      <form id="subscription-form-checkout">
        <div class="subscription-form-group">
          <label for="subscription-form-checkout__cardNumber">Número do Cartão</label>
          <div id="subscription-form-checkout__cardNumber" class="subscription-container"></div>
        </div>
        
        <div class="subscription-form-group">
          <label for="subscription-form-checkout__cardholderName">Nome Completo do Titular</label>
          <input type="text" id="subscription-form-checkout__cardholderName" class="subscription-form-control" placeholder="Nome e sobrenome" />
        </div>
        
        <div class="subscription-form-group">
          <label for="subscription-form-checkout__cardholderEmail">E-mail</label>
          <input type="email" id="subscription-form-checkout__cardholderEmail" class="subscription-form-control" />
        </div>
        
        <div style="display: flex; gap: 16px;">
          <div class="subscription-form-group" style="flex: 1;">
            <label for="subscription-form-checkout__expirationDate">Data de Validade</label>
            <div id="subscription-form-checkout__expirationDate" class="subscription-container"></div>
          </div>
          
          <div class="subscription-form-group" style="flex: 1;">
            <label for="subscription-form-checkout__securityCode">CVV</label>
            <div id="subscription-form-checkout__securityCode" class="subscription-container"></div>
          </div>
        </div>
        
        <div class="subscription-form-group">
          <label for="subscription-form-checkout__issuer">Banco Emissor</label>
          <select id="subscription-form-checkout__issuer" class="subscription-form-control"></select>
        </div>
        
        <div class="subscription-form-group">
          <label for="subscription-form-checkout__installments">Parcelas</label>
          <select id="subscription-form-checkout__installments" class="subscription-form-control"></select>
        </div>
        
        <div style="display: flex; gap: 16px;">
          <div class="subscription-form-group" style="flex: 1;">
            <label for="subscription-form-checkout__identificationType">Tipo de Documento</label>
            <select id="subscription-form-checkout__identificationType" class="subscription-form-control"></select>
          </div>
          
          <div class="subscription-form-group" style="flex: 1;">
            <label for="subscription-form-checkout__identificationNumber">Número do Documento</label>
            <input type="text" id="subscription-form-checkout__identificationNumber" class="subscription-form-control" />
          </div>
        </div>
        
        <button type="submit" id="subscription-form-checkout__submit" ${processingPayment ? 'disabled' : ''}>
          ${processingPayment ? 'Processando assinatura...' : 'Criar Assinatura Mensal'}
        </button>
        <progress value="0" class="subscription-progress-bar" id="subscription-payment-progress">Carregando...</progress>
      </form>
    `;
  };
  
  const cleanupMercadoPagoElements = () => {
    const hiddenInputs = document.querySelectorAll('[id^="MPHidden"]');
    hiddenInputs.forEach((element) => {
      element.remove();
    });
    
    const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
    mpIframes.forEach((iframe) => {
      iframe.remove();
    });
    
    const formStyles = document.getElementById('subscription-form-styles');
    if (formStyles) {
      formStyles.remove();
    }
    
    const formContainer = document.getElementById('subscription-form-container');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
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
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Assinatura Mensal Recorrente</h3>
        <p className="text-sm text-blue-800">
          Ao criar esta assinatura, você será cobrado mensalmente no valor de {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          para manter seu espaço sempre promovido. O primeiro pagamento será processado hoje e os próximos sempre na mesma data do mês.
        </p>
      </div>
      
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
              Criar Assinatura Mensal
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dados do Cartão para Assinatura</h3>
          <div id="subscription-form-container" className="mt-6"></div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCheckout;
