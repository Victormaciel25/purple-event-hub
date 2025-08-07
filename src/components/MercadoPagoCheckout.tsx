import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
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
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [sdkLoadId, setSdkLoadId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const mpInstanceRef = useRef<any>(null);
  
  // Generate unique IDs for this instance
  const instanceId = useRef(`mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Complete cleanup function
  const completeCleanup = () => {
    console.log('Starting complete cleanup...');
    
    // Clear MP instance reference
    if (mpInstanceRef.current) {
      try {
        if (typeof mpInstanceRef.current.destroy === 'function') {
          mpInstanceRef.current.destroy();
        }
      } catch (e) {
        console.log('Instance cleanup attempted');
      }
      mpInstanceRef.current = null;
    }
    
    // Remove ALL MercadoPago related elements
    document.querySelectorAll(`
      [id^="MPHidden"],
      iframe[src*="mercadopago"],
      iframe[src*="mercadolibre"],
      script[src*="mercadopago"],
      [class*="mercadopago"],
      [class*="mp-"],
      [id*="mercadopago"],
      [id*="mp-"],
      .mercadopago-overlay
    `).forEach(el => {
      el.remove();
    });
    
    // Clear window MercadoPago
    if (window.MercadoPago) {
      try {
        delete window.MercadoPago;
      } catch (e) {
        window.MercadoPago = undefined;
      }
    }
    
    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Reset states
    setShowCheckoutForm(false);
    setErrorMessage(null);
    setPaymentStatus(null);
    setProcessingPayment(false);
    
    console.log('Complete cleanup finished');
  };

  // Force reload MercadoPago SDK
  const forceReloadSDK = () => {
    return new Promise<void>((resolve, reject) => {
      completeCleanup();
      
      const newLoadId = `sdk-${Date.now()}`;
      setSdkLoadId(newLoadId);
      
      console.log('Force loading fresh MercadoPago SDK...');
      
      const script = document.createElement('script');
      script.src = `https://sdk.mercadopago.com/js/v2?_t=${Date.now()}`;
      script.id = `mp-sdk-${newLoadId}`;
      
      script.onload = () => {
        console.log('Fresh MercadoPago SDK loaded');
        setTimeout(() => resolve(), 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load fresh SDK');
        reject(new Error('Failed to load payment SDK'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Initialize data
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        } else {
          setErrorMessage("Você precisa estar logado para realizar um pagamento.");
          return;
        }
        
        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        
        if (error) {
          setErrorMessage("Erro ao obter chave de pagamento. Verifique sua conexão e tente novamente.");
          return;
        }
        
        if (mpKeyData && mpKeyData.public_key) {
          setMercadoPagoPublicKey(mpKeyData.public_key);
        } else {
          setErrorMessage("Configuração de pagamento incompleta. Entre em contato com o suporte.");
        }
      } catch (error) {
        setErrorMessage("Erro ao inicializar o checkout. Tente recarregar a página.");
      }
    };
    
    initialize();
    
    return () => {
      completeCleanup();
    };
  }, []);

  const handleShowCheckout = async () => {
    if (!mercadoPagoPublicKey || !userId) {
      toast({
        title: "Erro",
        description: "Dados de pagamento não disponíveis. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Force reload SDK and initialize
      await forceReloadSDK();
      await initializePaymentForm();
      setShowCheckoutForm(true);
    } catch (error) {
      console.error("Error showing checkout:", error);
      setErrorMessage("Erro ao carregar formulário de pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentForm = async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!window.MercadoPago || !mercadoPagoPublicKey) {
          reject(new Error("MercadoPago SDK not available"));
          return;
        }
        
        console.log('Initializing fresh payment form...');
        
        const mp = new window.MercadoPago(mercadoPagoPublicKey, {
          locale: 'pt-BR'
        });
        
        // Create fresh container
        const container = containerRef.current;
        if (!container) {
          reject(new Error("Container not found"));
          return;
        }
        
        // Generate unique form ID
        const formId = `form-checkout-${instanceId}`;
        
        container.innerHTML = `
          <form id="${formId}" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Número do cartão</label>
                <div id="${formId}__cardNumber" class="h-12 border rounded-lg"></div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Validade</label>
                <div id="${formId}__expirationDate" class="h-12 border rounded-lg"></div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">CVV</label>
                <div id="${formId}__securityCode" class="h-12 border rounded-lg"></div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Parcelas</label>
                <div id="${formId}__installments" class="h-12 border rounded-lg"></div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Nome no cartão</label>
              <div id="${formId}__cardholderName" class="h-12 border rounded-lg"></div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Tipo de documento</label>
                <div id="${formId}__identificationType" class="h-12 border rounded-lg"></div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Número do documento</label>
                <div id="${formId}__identificationNumber" class="h-12 border rounded-lg"></div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">E-mail</label>
              <div id="${formId}__cardholderEmail" class="h-12 border rounded-lg"></div>
            </div>
            
            <div id="${formId}__issuer" style="display: none;"></div>
            
            <button type="submit" id="form-checkout__submit" class="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors" ${processingPayment ? 'disabled' : ''}>
              ${processingPayment ? 'Processando...' : `Pagar ${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
            </button>
          </form>
        `;
        
        // Initialize cardForm
        setTimeout(() => {
          try {
            const cardForm = mp.cardForm({
              amount: plan.price.toString(),
              iframe: true,
              form: {
                id: formId,
                cardNumber: { id: `${formId}__cardNumber` },
                expirationDate: { id: `${formId}__expirationDate` },
                securityCode: { id: `${formId}__securityCode` },
                cardholderName: { id: `${formId}__cardholderName` },
                issuer: { id: `${formId}__issuer` },
                installments: { id: `${formId}__installments` },
                identificationType: { id: `${formId}__identificationType` },
                identificationNumber: { id: `${formId}__identificationNumber` },
                cardholderEmail: { id: `${formId}__cardholderEmail` },
              },
              callbacks: {
                onFormMounted: error => {
                  if (error) {
                    reject(error);
                    return;
                  }
                  console.log("Fresh form mounted successfully");
                  resolve();
                },
                onSubmit: async event => {
                  event.preventDefault();
                  await handleFormSubmit(cardForm, mp);
                },
              },
            });
            
            mpInstanceRef.current = cardForm;
          } catch (error) {
            reject(error);
          }
        }, 300);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleFormSubmit = async (cardForm: any, mp: any) => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setErrorMessage(null);
    
    try {
      const formData = cardForm.getCardFormData();
      
      let deviceId = null;
      try {
        deviceId = mp.getDeviceFingerprint();
      } catch (e) {
        console.warn("Could not get device fingerprint");
      }
      
      const cardholderName = formData.cardholderName || '';
      const nameParts = cardholderName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

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

          completeCleanup();
          
          if (onSuccess) {
            onSuccess();
          }
        } else if (data.status === "in_process" || data.status === "pending") {
          toast({
            title: "Pagamento em processamento",
            description: "Aguarde a confirmação do pagamento.",
            variant: "default"
          });
        } else {
          setErrorMessage(`Pagamento registrado com status: ${data.status}`);
        }
      } else {
        const errorMsg = data?.error || "Ocorreu um erro ao processar o pagamento.";
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar pagamento.";
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
      setProcessingPayment(false);
    }
  };

  const handleReset = () => {
    completeCleanup();
    setLoading(false);
  };

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button onClick={handleReset} variant="outline" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (paymentStatus === "approved") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-600 mb-2">
          Pagamento Aprovado!
        </h3>
        <p className="text-muted-foreground">
          Sua promoção foi ativada com sucesso.
        </p>
      </div>
    );
  }

  if (!showCheckoutForm) {
    return (
      <div className="space-y-4">
        <Button 
          onClick={handleShowCheckout}
          disabled={loading}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Carregando...
            </>
          ) : (
            `Pagar ${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pagamento com Cartão</h3>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Resetar
        </Button>
      </div>
      <div 
        ref={containerRef}
        id={`payment-container-${instanceId}`}
        className="space-y-4"
      />
    </div>
  );
};

export default MercadoPagoCheckout;