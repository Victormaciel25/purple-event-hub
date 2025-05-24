import React, { useEffect, useState, useRef } from 'react';
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
  // ref para guardar a instância do cardForm do SDK
  const cardFormRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // 1) Busca o usuário e a public key ao montar
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setErrorMessage("Você precisa estar logado para realizar um pagamento.");
          return;
        }
        setUserId(data.session.user.id);

        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        if (error || !mpKeyData?.public_key) {
          throw error || new Error("Chave não encontrada");
        }
        setMercadoPagoPublicKey(mpKeyData.public_key);
      } catch (err: any) {
        console.error("Init error:", err);
        setErrorMessage("Erro ao inicializar checkout.");
      }
    })();
  }, []);

  // 2) Carrega o SDK do Mercado Pago
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    const load = () => {
      if (!window.MercadoPago && !document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
        script = document.createElement('script');
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => setSdkReady(true);
        script.onerror = () => setErrorMessage("Falha ao carregar SDK Mercado Pago");
        document.body.appendChild(script);
      } else if (window.MercadoPago) {
        setSdkReady(true);
      }
    };
    setTimeout(load, 100);
    return () => {
      if (script) script.remove();
      cleanupMercadoPagoElements();
    };
  }, []);

  // 3) Quando o usuário clica em "Continuar para o pagamento"
  const handleShowCheckout = async () => {
    if (!sdkReady) {
      toast({ title: "Aguarde", description: "SDK carregando...", variant: "default" });
      return;
    }
    if (!mercadoPagoPublicKey || !userId) {
      toast({ title: "Erro", description: "Configuração incompleta.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setShowCheckoutForm(true);
    // aguarda um tiquinho para garantir o container no DOM
    setTimeout(() => {
      initializePaymentForm();
      setLoading(false);
    }, 300);
  };

  // 4) Inicializa o cardForm e guarda na ref
  const initializePaymentForm = () => {
    if (initializationAttempted) return;
    if (!window.MercadoPago || !mercadoPagoPublicKey) {
      setErrorMessage("SDK ou chave indisponível");
      return;
    }
    setInitializationAttempted(true);

    // inject styles
    const existing = document.getElementById('mp-form-styles');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'mp-form-styles';
    style.textContent = `
      #form-checkout { display:flex; flex-direction:column; gap:16px; max-width:600px; margin:0 auto; }
      .container, .form-control { height:40px; border:1px solid #D1D5DB; border-radius:.375rem; padding:8px 12px; font-size:16px; width:100%; }
      #form-checkout__submit { background:#9333EA;color:#fff;padding:10px 16px;border:none;border-radius:.375rem; cursor:pointer; }
      #form-checkout__submit:disabled { opacity:.5; cursor:not-allowed; }
      .progress-bar { width:100%; height:8px; margin-top:16px; }
    `;
    document.head.appendChild(style);

    // monta o HTML do form
    const container = document.getElementById('payment-form-container');
    if (!container) {
      setErrorMessage("Container não encontrado");
      return;
    }
    container.innerHTML = `
      <form id="form-checkout">
        <div class="form-group">
          <label for="form-checkout__cardNumber">Número do cartão</label>
          <div id="form-checkout__cardNumber" class="container"></div>
        </div>
        <div class="form-group">
          <label for="form-checkout__cardholderName">Titular</label>
          <input id="form-checkout__cardholderName" class="form-control" />
        </div>
        <div class="form-group">
          <label for="form-checkout__cardholderEmail">E-mail</label>
          <input id="form-checkout__cardholderEmail" type="email" class="form-control" />
        </div>
        <div style="display:flex; gap:16px;">
          <div class="form-group" style="flex:1;">
            <label for="form-checkout__expirationDate">Validade</label>
            <div id="form-checkout__expirationDate" class="container"></div>
          </div>
          <div class="form-group" style="flex:1;">
            <label for="form-checkout__securityCode">CVV</label>
            <div id="form-checkout__securityCode" class="container"></div>
          </div>
        </div>
        <div class="form-group">
          <label for="form-checkout__issuer">Emissor</label>
          <select id="form-checkout__issuer" class="form-control"></select>
        </div>
        <div class="form-group">
          <label for="form-checkout__installments">Parcelas</label>
          <select id="form-checkout__installments" class="form-control"></select>
        </div>
        <div style="display:flex; gap:16px;">
          <div class="form-group" style="flex:1;">
            <label for="form-checkout__identificationType">Doc. Tipo</label>
            <select id="form-checkout__identificationType" class="form-control"></select>
          </div>
          <div class="form-group" style="flex:1;">
            <label for="form-checkout__identificationNumber">Doc. Nº</label>
            <input id="form-checkout__identificationNumber" class="form-control" />
          </div>
        </div>
        <button type="submit" id="form-checkout__submit">Pagar</button>
        <progress id="payment-progress" class="progress-bar" hidden></progress>
      </form>
    `;

    // inicializa o MP CardForm
    const mp = new window.MercadoPago(mercadoPagoPublicKey);
    const cardForm = mp.cardForm({
      amount: plan.price.toString(),
      iframe: true,
      form: {
        id: "form-checkout",
        cardNumber: { id: "form-checkout__cardNumber", placeholder: "1234 5678 9012 3456" },
        expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/AA" },
        securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
        cardholderName: { id: "form-checkout__cardholderName", placeholder: "Nome impresso" },
        issuer: { id: "form-checkout__issuer" },
        installments: { id: "form-checkout__installments" },
        identificationType: { id: "form-checkout__identificationType" },
        identificationNumber: { id: "form-checkout__identificationNumber" },
        cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "email@exemplo.com" },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) console.warn("Form mounted error:", error);
        },
        onFetching: (_resource: any) => {
          const pb = document.getElementById("payment-progress");
          if (pb) pb.removeAttribute("hidden");
        },
        onSubmit: async (event: Event) => {
          event.preventDefault();
          await handleFormSubmit(cardForm);
        }
      }
    });
    // guarda a instância
    cardFormRef.current = cardForm;
  };

  // 5) Processa o pagamento usando a instância guardada
  const handleFormSubmit = async (cardForm: any) => {
    if (processingPayment) return;
    setProcessingPayment(true);
    setErrorMessage(null);

    try {
      // pega os dados via SDK
      const formData = cardForm.getCardFormData();
      // chama sua edge function
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
          description: `Promoção: ${spaceName} - ${plan.name}`
        })
      });
      if (error || !data?.success) {
        throw error || new Error(data?.error || 'Erro no pagamento');
      }
      setPaymentStatus(data.status);
      if (data.status === 'approved') {
        toast({ title: "Pagamento aprovado!", description: "", variant: "default" });
        cleanupMercadoPagoElements();
        onSuccess?.();
      } else {
        toast({ title: `Status: ${data.status}`, description: "", variant: "default" });
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Erro ao processar pagamento");
      onError?.();
    } finally {
      setProcessingPayment(false);
      const pb = document.getElementById("payment-progress");
      if (pb) pb.setAttribute("hidden", "true");
    }
  };

  // 6) Limpa iframes, hidden inputs e estilos
  const cleanupMercadoPagoElements = () => {
    document.querySelectorAll('[id^="MPHidden"]').forEach(n => n.remove());
    document.querySelectorAll('iframe[src*="mercadopago"]').forEach(n => n.remove());
    document.getElementById('mp-form-styles')?.remove();
    const container = document.getElementById('payment-form-container');
    if (container) container.innerHTML = '';
  };

  return (
    <div className="flex flex-col w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro no processamento</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {paymentStatus && paymentStatus !== 'approved' && (
        <Alert className="mb-4">
          <AlertTitle>Status do Pagamento</AlertTitle>
          <AlertDescription>Seu pagamento está: {paymentStatus}</AlertDescription>
        </Alert>
      )}
      {!showCheckoutForm ? (
        <Button
          size="lg"
          onClick={handleShowCheckout}
          disabled={loading || !sdkReady || !mercadoPagoPublicKey || !userId}
          className="bg-iparty hover:bg-iparty/90"
        >
          {loading || !sdkReady ? (
            <>
              <Loader2 className="mr-2 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <Check className="mr-2" />
              Continuar para o pagamento
            </>
          )}
        </Button>
      ) : (
        <div className="mt-6" id="payment-form-container" />
      )}
    </div>
  );
};

export default MercadoPagoCheckout;
