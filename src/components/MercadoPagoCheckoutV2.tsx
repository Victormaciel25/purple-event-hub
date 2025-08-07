import React, { useState, useEffect } from 'react';
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

// Componente completamente isolado que sempre é remontado
const MercadoPagoIsolatedForm: React.FC<{
  publicKey: string;
  amount: number;
  formattedPrice: string;
  onPaymentData: (data: any) => void;
  uniqueKey: string;
}> = ({ publicKey, amount, formattedPrice, onPaymentData, uniqueKey }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Cleanup anterior
    const cleanup = () => {
      // Remove todas as instâncias do MercadoPago
      if (window.MercadoPago) {
        delete window.MercadoPago;
      }
      
      // Remove scripts anteriores
      const oldScripts = document.querySelectorAll('script[src*="mercadopago"]');
      oldScripts.forEach(script => script.remove());
      
      // Limpa containers antigos
      const containers = document.querySelectorAll('[id*="mp-checkout"]');
      containers.forEach(container => container.remove());
    };

    cleanup();

    // Carrega SDK com timestamp único
    const loadMercadoPago = () => {
      const script = document.createElement('script');
      script.src = `https://sdk.mercadopago.com/js/v2?t=${Date.now()}`;
      script.onload = () => {
        try {
          const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
          
          const cardForm = mp.cardForm({
            amount: amount.toString(),
            iframe: false,
            form: {
              id: `payment-form-${uniqueKey}`,
              cardNumber: {
                id: `cardNumber-${uniqueKey}`,
                placeholder: 'Número do cartão'
              },
              expirationDate: {
                id: `expirationDate-${uniqueKey}`,
                placeholder: 'MM/YY'
              },
              securityCode: {
                id: `securityCode-${uniqueKey}`,
                placeholder: 'CVV'
              },
              cardholderName: {
                id: `cardholderName-${uniqueKey}`,
                placeholder: 'Nome no cartão'
              },
              issuer: {
                id: `issuer-${uniqueKey}`
              },
              installments: {
                id: `installments-${uniqueKey}`
              },
              identificationType: {
                id: `identificationType-${uniqueKey}`
              },
              identificationNumber: {
                id: `identificationNumber-${uniqueKey}`,
                placeholder: 'Número do documento'
              },
              cardholderEmail: {
                id: `cardholderEmail-${uniqueKey}`,
                placeholder: 'E-mail'
              }
            },
            callbacks: {
              onFormMounted: (error) => {
                if (error) {
                  setError('Erro ao carregar formulário');
                } else {
                  setLoading(false);
                }
              },
              onSubmit: (event) => {
                event.preventDefault();
                if (processing) return;
                
                setProcessing(true);
                try {
                  const formData = cardForm.getCardFormData();
                  let deviceId = null;
                  try {
                    deviceId = mp.getDeviceFingerprint();
                  } catch (e) {
                    console.warn('Could not get device fingerprint');
                  }
                  
                  onPaymentData({
                    ...formData,
                    deviceId: deviceId
                  });
                } catch (error) {
                  setError('Erro ao processar dados do cartão');
                  setProcessing(false);
                }
              }
            }
          });
        } catch (error) {
          setError('Erro ao inicializar pagamento');
        }
      };
      script.onerror = () => setError('Erro ao carregar SDK do MercadoPago');
      document.head.appendChild(script);
    };

    loadMercadoPago();

    // Cleanup na desmontagem
    return () => {
      cleanup();
    };
  }, [publicKey, amount, uniqueKey, onPaymentData, processing]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Carregando formulário de pagamento...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form id={`payment-form-${uniqueKey}`} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Número do cartão</label>
            <div id={`cardNumber-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Validade</label>
            <div id={`expirationDate-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">CVV</label>
            <div id={`securityCode-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Parcelas</label>
            <div id={`installments-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Nome no cartão</label>
          <div id={`cardholderName-${uniqueKey}`} className="h-12 border rounded-lg"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de documento</label>
            <div id={`identificationType-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Número do documento</label>
            <div id={`identificationNumber-${uniqueKey}`} className="h-12 border rounded-lg"></div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">E-mail</label>
          <div id={`cardholderEmail-${uniqueKey}`} className="h-12 border rounded-lg"></div>
        </div>
        
        <div id={`issuer-${uniqueKey}`} style={{ display: 'none' }}></div>
        
        <Button 
          type="submit" 
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            `Pagar ${formattedPrice}`
          )}
        </Button>
      </form>
    </div>
  );
};

const MercadoPagoCheckoutV2: React.FC<CheckoutProps> = ({ 
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
  const [formKey, setFormKey] = useState<string>(Date.now().toString());
  
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
  }, []);

  const handleShowCheckout = () => {
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
    setFormKey(Date.now().toString()); // Nova key para forçar re-render
    setShowCheckoutForm(true);
    setLoading(false);
  };

  const handlePaymentData = async (data: any) => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    
    try {
      const cardholderName = data.cardholderName || '';
      const nameParts = cardholderName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: paymentResult, error } = await supabase.functions.invoke('process-payment', {
        body: JSON.stringify({
          token: data.token,
          issuer_id: data.issuerId,
          payment_method_id: data.paymentMethodId,
          transaction_amount: data.amount,
          installments: data.installments,
          email: data.cardholderEmail,
          identification: {
            type: data.identificationType,
            number: data.identificationNumber
          },
          payer: {
            email: data.cardholderEmail,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: data.identificationType,
              number: data.identificationNumber
            }
          },
          device_id: data.deviceId,
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          description: `Promoção do espaço: ${spaceName} - Plano ${plan.name}`
        })
      });
      
      if (error) {
        throw new Error("Erro na comunicação com o servidor de pagamentos");
      }
      
      if (paymentResult && paymentResult.success) {
        setPaymentStatus(paymentResult.status);
        
        if (paymentResult.status === "approved") {
          toast({
            title: "Pagamento aprovado!",
            description: "Seu espaço foi promovido com sucesso.",
            variant: "default"
          });
          
          if (onSuccess) {
            onSuccess();
          }
        } else if (paymentResult.status === "in_process" || paymentResult.status === "pending") {
          toast({
            title: "Pagamento em processamento",
            description: "Aguarde a confirmação do pagamento.",
            variant: "default"
          });
        } else {
          setErrorMessage(`Pagamento registrado com status: ${paymentResult.status}`);
        }
      } else {
        const errorMsg = paymentResult?.error || "Ocorreu um erro ao processar o pagamento.";
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
    setShowCheckoutForm(false);
    setErrorMessage(null);
    setPaymentStatus(null);
    setProcessingPayment(false);
    setFormKey(Date.now().toString()); // Nova key para próxima tentativa
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
      
      {mercadoPagoPublicKey && (
        <MercadoPagoIsolatedForm
          key={formKey} // Key única para forçar re-render completo
          publicKey={mercadoPagoPublicKey}
          amount={plan.price}
          formattedPrice={plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          onPaymentData={handlePaymentData}
          uniqueKey={formKey}
        />
      )}
    </div>
  );
};

export default MercadoPagoCheckoutV2;