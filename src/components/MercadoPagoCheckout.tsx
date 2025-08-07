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
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
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

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      switch (event.data.type) {
        case 'IFRAME_READY':
          setIframeReady(true);
          break;
          
        case 'PAYMENT_DATA':
          await handlePaymentData(event.data.data);
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId, spaceId, plan, spaceName]);

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
    setShowCheckoutForm(true);
    
    // Wait for iframe to be ready before sending data
    const checkIframeReady = () => {
      if (iframeReady && iframeRef.current) {
        const paymentData = {
          publicKey: mercadoPagoPublicKey,
          amount: plan.price,
          formattedPrice: plan.price.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          })
        };
        
        iframeRef.current.contentWindow?.postMessage({
          type: 'INIT_PAYMENT',
          data: paymentData
        }, '*');
        
        setLoading(false);
      } else {
        setTimeout(checkIframeReady, 100);
      }
    };
    
    checkIframeReady();
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
        
        // Send result to iframe
        iframeRef.current?.contentWindow?.postMessage({
          type: 'PAYMENT_RESULT',
          success: true
        }, '*');
        
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
        
        // Send error to iframe
        iframeRef.current?.contentWindow?.postMessage({
          type: 'PAYMENT_RESULT',
          success: false,
          error: errorMsg
        }, '*');
        
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar pagamento.";
      
      // Send error to iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PAYMENT_RESULT',
        success: false,
        error: errorMsg
      }, '*');
      
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
    setIframeReady(false);
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
      
      <div className="border rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/mercadopago-iframe.html"
          className="w-full h-[600px] border-0"
          title="Formulário de Pagamento MercadoPago"
        />
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Inicializando formulário de pagamento...
          </p>
        </div>
      )}
    </div>
  );
};

export default MercadoPagoCheckout;