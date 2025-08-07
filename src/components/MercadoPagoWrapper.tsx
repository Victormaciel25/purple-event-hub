import React, { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
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
  wrapperKey: number; // Key to force complete reset
};

const MercadoPagoWrapper: React.FC<CheckoutProps> = ({ 
  spaceId, 
  spaceName, 
  plan,
  onSuccess,
  onError,
  wrapperKey
}) => {
  const [loading, setLoading] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<string>('');

  // Reset everything when wrapperKey changes
  useEffect(() => {
    setShowCheckoutForm(false);
    setErrorMessage(null);
    setPaymentStatus(null);
    setProcessingPayment(false);
    setMpInstance(null);
    
    // Force complete DOM cleanup
    const formContainer = document.getElementById(`mp-container-${wrapperKey}`);
    if (formContainer) {
      formContainer.innerHTML = '';
    }
  }, [wrapperKey]);

  // Initialize user and fetch public key
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        } else {
          setErrorMessage("Você precisa estar logado para realizar um pagamento.");
          return;
        }
        
        // Fetch Mercado Pago public key
        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        
        if (error || !mpKeyData?.public_key) {
          setErrorMessage("Erro ao obter configurações de pagamento.");
          return;
        }
        
        setPublicKey(mpKeyData.public_key);
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Erro ao inicializar o checkout.");
      }
    };
    
    initialize();
  }, [wrapperKey]);

  const handleShowCheckout = async () => {
    if (!publicKey || !userId) {
      toast({
        title: "Erro",
        description: "Sistema não inicializado. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Create completely new container
      const containerId = `mp-container-${wrapperKey}`;
      const container = document.getElementById(containerId);
      if (!container) {
        setErrorMessage("Container não encontrado");
        return;
      }
      
      // Clear any existing content
      container.innerHTML = '';
      
      // Create unique form
      const formId = `mp-form-${wrapperKey}-${Date.now()}`;
      const formHTML = `
        <form id="${formId}" class="space-y-6 p-6 bg-white rounded-lg border">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Número do cartão</label>
              <div id="${formId}__cardNumber" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Validade</label>
              <div id="${formId}__expirationDate" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Código de segurança</label>
              <div id="${formId}__securityCode" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Nome no cartão</label>
              <div id="${formId}__cardholderName" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">CPF</label>
              <div id="${formId}__identificationNumber" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Email</label>
              <div id="${formId}__cardholderEmail" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Banco emissor</label>
              <div id="${formId}__issuer" class="h-12 border rounded-lg"></div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Parcelas</label>
              <div id="${formId}__installments" class="h-12 border rounded-lg"></div>
            </div>
          </div>
          <select id="${formId}__identificationType" class="hidden">
            <option value="CPF" selected>CPF</option>
          </select>
          <button type="submit" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700">
            Pagar ${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </button>
        </form>
      `;
      
      container.innerHTML = formHTML;
      
      // Load fresh SDK
      await loadMercadoPagoSDK();
      
      // Initialize with completely fresh instance
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      setMpInstance(mp);
      
      // Create card form
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
              console.error("Form mount error:", error);
              setErrorMessage("Erro ao carregar formulário");
              return;
            }
            console.log("Form mounted successfully");
          },
          onSubmit: async event => {
            event.preventDefault();
            await handleFormSubmit(cardForm, mp);
          },
        },
      });
      
      setShowCheckoutForm(true);
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage("Erro ao inicializar formulário de pagamento");
      
      if (onError) {
        onError();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMercadoPagoSDK = () => {
    return new Promise((resolve, reject) => {
      // Remove existing script if present
      const existingScript = document.querySelector('script[src*="mercadopago.com"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Clear window MP object
      if (window.MercadoPago) {
        delete window.MercadoPago;
      }
      
      const script = document.createElement('script');
      script.src = `https://sdk.mercadopago.com/js/v2?nocache=${Date.now()}`;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load SDK'));
      document.head.appendChild(script);
    });
  };

  const handleFormSubmit = async (cardForm: any, mp: any) => {
    if (processingPayment) return;
    
    setErrorMessage(null);
    setProcessingPayment(true);
    
    try {
      const formData = cardForm.getCardFormData();
      
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
          device_id: mp.getDeviceFingerprint(),
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          description: `Promoção do espaço: ${spaceName} - Plano ${plan.name}`
        })
      });
      
      if (error) {
        throw new Error("Erro na comunicação com o servidor");
      }
      
      if (data?.success && data.status === "approved") {
        setPaymentStatus("approved");
        toast({
          title: "Pagamento aprovado!",
          description: "Seu espaço foi promovido com sucesso.",
          variant: "default"
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(data?.error || "Pagamento não aprovado");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar pagamento";
      setErrorMessage(errorMsg);
      toast({
        title: "Erro no pagamento",
        description: errorMsg,
        variant: "destructive"
      });
      
      if (onError) {
        onError();
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  if (errorMessage) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (paymentStatus === "approved") {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Check className="h-4 w-4" />
        <AlertTitle>Pagamento Aprovado</AlertTitle>
        <AlertDescription>Seu espaço foi promovido com sucesso!</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!showCheckoutForm ? (
        <Button 
          onClick={handleShowCheckout}
          disabled={loading || processingPayment || !publicKey || !userId}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            'Continuar com cartão de crédito'
          )}
        </Button>
      ) : (
        <>
          <div 
            id={`mp-container-${wrapperKey}`}
            className="w-full"
          />
          {processingPayment && (
            <div className="text-center p-4">
              <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
              Processando pagamento...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MercadoPagoWrapper;