// src/components/MercadoPagoCheckout.tsx
import React, { useEffect, useState, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export {}; // assegura que este arquivo seja tratado como módulo

declare global {
  interface Window {
    MercadoPago: any;
  }
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
  const [mpInstance, setMpInstance] = useState<any>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // 1) Busca session & public key
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
          throw new Error(error?.message ?? "Chave pública não fornecida");
        }
        setMercadoPagoPublicKey(mpKeyData.public_key);
      } catch (err: any) {
        console.error("Erro na inicialização:", err);
        setErrorMessage("Não foi possível preparar o checkout. Tente novamente.");
      }
    })();
  }, []);

  // 2) Carrega SDK MercadoPago.JS v2
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    if (!window.MercadoPago && mercadoPagoPublicKey) {
      script = document.createElement('script');
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        setSdkReady(true);
      };
      script.onerror = () => {
        setErrorMessage("Erro ao carregar o SDK do Mercado Pago.");
      };
      document.body.appendChild(script);
    } else if (window.MercadoPago) {
      setSdkReady(true);
    }
    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [mercadoPagoPublicKey]);

  const handleShowCheckout = () => {
    if (!sdkReady || !mercadoPagoPublicKey) {
      toast({ title: "Aguarde", description: "Estamos preparando o checkout...", variant: "default" });
      return;
    }
    setShowCheckoutForm(true);
    setTimeout(initializePaymentForm, 300);
  };

  const initializePaymentForm = () => {
    if (initializationAttempted || !window.MercadoPago || !mercadoPagoPublicKey) return;
    setInitializationAttempted(true);

    const mp = new window.MercadoPago(mercadoPagoPublicKey, { locale: 'pt-BR' });
    setMpInstance(mp);

    // injeta estilos
    const style = document.createElement('style');
    style.id = "mp-form-styles";
    style.textContent = `
      #form-checkout { display:flex; flex-direction:column; gap:12px; max-width:600px; margin:auto; }
      .form-control, .container { width:100%; padding:8px; border:1px solid #d1d5db; border-radius:.375rem; font-size:16px; }
      .form-group label { font-size:14px; margin-bottom:4px; display:block; }
      #form-checkout__submit { background:#9333ea; color:white; padding:10px; border:none; border-radius:.375rem; cursor:pointer; }
      #form-checkout__submit:disabled { opacity:.5; cursor:not-allowed; }
      .progress-bar { width:100%; height:6px; margin-top:8px; }
    `;
    document.head.appendChild(style);

    // monta HTML do formulário
    const container = formContainerRef.current!;
    container.innerHTML = `
      <form id="form-checkout">
        <div class="form-group">
          <label for="payerFirstName">Nome do comprador</label>
          <input type="text" id="payerFirstName" name="payerFirstName" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="payerLastName">Sobrenome do comprador</label>
          <input type="text" id="payerLastName" name="payerLastName" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="form-checkout__cardNumber">Número do Cartão</label>
          <div id="form-checkout__cardNumber" class="container"></div>
        </div>
        <div class="form-group">
          <label for="form-checkout__expirationDate">Data de Validade</label>
          <div id="form-checkout__expirationDate" class="container"></div>
        </div>
        <div class="form-group">
          <label for="form-checkout__securityCode">CVV</label>
          <div id="form-checkout__securityCode" class="container"></div>
        </div>
        <div class="form-group">
          <label for="form-checkout__cardholderEmail">E-mail</label>
          <input type="email" id="form-checkout__cardholderEmail" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="form-checkout__identificationType">Tipo de Documento</label>
          <select id="form-checkout__identificationType" class="form-control" required></select>
        </div>
        <div class="form-group">
          <label for="form-checkout__identificationNumber">Número do Documento</label>
          <input type="text" id="form-checkout__identificationNumber" class="form-control" required />
        </div>
        <button type="submit" id="form-checkout__submit">Pagar</button>
        <progress id="payment-progress" class="progress-bar" value="0"></progress>
      </form>
    `;

    // inicializa Select de tipos de documento
    mp.getIdentificationTypes().then((types: any[]) => {
      const sel = document.getElementById('form-checkout__identificationType') as HTMLSelectElement;
      sel.innerHTML = `<option value="">Selecione</option>` +
        types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    });

    // inicializa cardForm
    mp.cardForm({
      amount: plan.price.toString(),
      form: {
        id: "form-checkout",
        cardNumber: { id: "form-checkout__cardNumber" },
        expirationDate: { id: "form-checkout__expirationDate" },
        securityCode: { id: "form-checkout__securityCode" },
        cardholderEmail: { id: "form-checkout__cardholderEmail" },
        identificationType: { id: "form-checkout__identificationType" },
        identificationNumber: { id: "form-checkout__identificationNumber" },
      },
      callbacks: {
        onFormMounted: (error: any) => {
          if (error) {
            console.error("onFormMounted error", error);
            setErrorMessage("Falha ao montar o formulário de pagamento.");
          }
        },
        onSubmit: async (event: any) => {
          event.preventDefault();
          await handleFormSubmit(event);
        },
        onFetching: () => {
          const pr = document.getElementById("payment-progress") as HTMLProgressElement;
          pr.removeAttribute("value");
          return () => pr.setAttribute("value", "0");
        }
      }
    });
  };

  const handleFormSubmit = async (e: Event) => {
    if (processingPayment) return;
    setProcessingPayment(true);
    setErrorMessage(null);

    try {
      const form = document.getElementById("form-checkout") as HTMLFormElement;
      const formData = new FormData(form);
      // tokeniza
      const cardForm = mpInstance.cardForm({}) as any;
      const cardData = cardForm.getCardFormData();
      // device fingerprint
      const deviceFingerprint = mpInstance.getDeviceFingerprint();

      // monta body
      const body = {
        token: cardData.token,
        payment_method_id: cardData.paymentMethodId,
        transaction_amount: cardData.amount,
        installments: cardData.installments,
        issuer_id: cardData.issuerId,
        payer: {
          first_name: formData.get("payerFirstName"),
          last_name: formData.get("payerLastName"),
          email: formData.get("form-checkout__cardholderEmail"),
          identification: {
            type: formData.get("form-checkout__identificationType"),
            number: formData.get("form-checkout__identificationNumber")
          }
        },
        device: {
          fingerprint: deviceFingerprint
        },
        space_id: spaceId,
        plan_id: plan.id,
        user_id: userId
      };

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: JSON.stringify(body)
      });

      if (error || !data.success) {
        throw new Error(error?.message ?? data.error ?? "Falha no pagamento");
      }

      if (data.status === "approved") {
        toast({ title: "Pagamento aprovado!", description: "Seu espaço foi promovido.", variant: "default" });
        cleanup();
        onSuccess?.();
      } else {
        setPaymentStatus(data.status);
        toast({ title: "Status", description: `Pagamento: ${data.status}`, variant: "default" });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
      onError?.();
    } finally {
      setProcessingPayment(false);
    }
  };

  const cleanup = () => {
    const style = document.getElementById("mp-form-styles");
    if (style) style.remove();
    formContainerRef.current!.innerHTML = "";
  };

  const canShow = sdkReady && mercadoPagoPublicKey && !errorMessage;

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
          </AlertDescription>
        </Alert>
      )}
      {!showCheckoutForm ? (
        <Button size="lg" onClick={handleShowCheckout} disabled={!canShow}>
          {loading || !sdkReady ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <Check className="mr-2" />
          )}
          Continuar para o pagamento
        </Button>
      ) : (
        <div ref={formContainerRef} className="mt-6" />
      )}
    </div>
  );
};

export default MercadoPagoCheckout;
