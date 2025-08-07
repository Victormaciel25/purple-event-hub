import React, { useEffect, useMemo, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  recurring: boolean;
}

type Props = {
  spaceId: string;
  spaceName: string;
  plan: Plan;
  onSuccess?: () => void;
  onError?: () => void;
  wrapperKey: number; // to force remount if needed
};

const MercadoPagoCardBrick: React.FC<Props> = ({
  spaceId,
  spaceName,
  plan,
  onSuccess,
  onError,
  wrapperKey,
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  // Fetch session and public key once
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setErrorMessage("Você precisa estar logado para realizar um pagamento.");
          return;
        }
        if (!active) return;
        setUserId(sessionData.session.user.id);

        const { data: mpKeyData, error } = await supabase.functions.invoke(
          "get-mercado-pago-public-key"
        );
        if (error || !mpKeyData?.public_key) {
          setErrorMessage("Erro ao obter configurações de pagamento.");
          return;
        }
        if (!active) return;
        setPublicKey(mpKeyData.public_key as string);
      } catch (err) {
        console.error("Erro ao inicializar Mercado Pago:", err);
        if (!active) return;
        setErrorMessage("Erro ao inicializar o checkout.");
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [wrapperKey]);

  // Initialize SDK when we are about to render the brick
  useEffect(() => {
    if (!showCheckout || !publicKey) return;
    try {
      initMercadoPago(publicKey, { locale: "pt-BR" });
    } catch (e) {
      // initMercadoPago is idempotent, ignore if already initialized
    }
  }, [showCheckout, publicKey]);

  const paymentInitialization = useMemo(
    () => ({
      amount: Number(plan.price),
      // You can pass additional payer info here if desired
    }),
    [plan.price]
  );

  const handleOpen = () => {
    if (!publicKey || !userId) {
      toast({
        title: "Erro",
        description: "Sistema não inicializado. Tente recarregar a página.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      setShowCheckout(true);
      setLoading(false);
    }, 50);
  };

  const handleSubmit = async (formData: any) => {
    if (processing) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      // Extract safe values from brick form
      const token = formData?.token;
      const payment_method_id = formData?.payment_method_id;
      const issuer_id = formData?.issuer_id;
      const installments = Number(formData?.installments || 1);
      const payerEmail = formData?.payer?.email || formData?.cardholderEmail;
      const identification = formData?.payer?.identification || {
        type: formData?.identificationType,
        number: formData?.identificationNumber,
      };

      // Cardholder name split (best-effort)
      const fullName = formData?.payer?.name || formData?.cardholderName || "";
      const parts = String(fullName).trim().split(" ");
      const first_name = parts[0] || "";
      const last_name = parts.slice(1).join(" ") || "";

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: JSON.stringify({
          token,
          issuer_id,
          payment_method_id,
          transaction_amount: Number(plan.price),
          installments,
          email: payerEmail,
          identification,
          payer: {
            email: payerEmail,
            first_name,
            last_name,
            identification,
          },
          // Brick handles device fingerprint internally
          space_id: spaceId,
          plan_id: plan.id,
          user_id: userId,
          description: `Promoção do espaço: ${spaceName} - Plano ${plan.name}`,
        }),
      });

      if (error) throw new Error("Erro na comunicação com o servidor");

      if (data?.success && data.status === "approved") {
        setApproved(true);
        toast({
          title: "Pagamento aprovado!",
          description: "Seu espaço foi promovido com sucesso.",
        });
        onSuccess?.();
        return { status: "success" } as any; // for brick
      }

      throw new Error(data?.error || "Pagamento não aprovado");
    } catch (err: any) {
      console.error("Payment error (brick):", err);
      const msg = err?.message || "Erro ao processar pagamento";
      setErrorMessage(msg);
      toast({ title: "Erro no pagamento", description: msg, variant: "destructive" });
      onError?.();
      return { status: "error", message: msg } as any; // for brick
    } finally {
      setProcessing(false);
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

  if (approved) {
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
      {!showCheckout ? (
        <Button
          onClick={handleOpen}
          disabled={loading || processing || !publicKey || !userId}
          className="w-full h-12"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            "Continuar com cartão de crédito"
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Finalize o pagamento com segurança pelo Mercado Pago.
          </div>
          {/* Force remount with wrapperKey to guarantee a fresh brick instance */}
          <div className="flex justify-center">
            <div className="w-full max-w-md mx-auto">
              <CardPayment
                key={wrapperKey}
                locale="pt-BR"
                initialization={paymentInitialization as any}
                customization={{
                  paymentMethods: { creditCard: 'all' },
                  visual: {
                    texts: {
                      formTitle: "Preencha seus dados",
                      // Títulos/agrupadores
                      cardholderIdentification: "Documento do titular",
                      enterYourDetails: "Seus dados",
                      // Campos
                      cardNumber: { label: "Número do cartão", placeholder: "1234 1234 1234 1234" },
                      expirationDate: { label: "Validade", placeholder: "MM/AA" },
                      securityCode: { label: "Código de segurança", placeholder: "Ex.: 123" },
                      cardholderName: { label: "Nome impresso no cartão" },
                      identification: { label: "CPF", placeholder: "000.000.000-00" },
                      email: { label: "E-mail" },
                      payButton: "Pagar"
                    }
                  }
                } as any}
                onSubmit={(param: any) => handleSubmit(param?.formData ?? param)}
                onReady={() => {
                  // Brick ready
                }}
                onError={(error: any) => {
                  console.error("Brick error:", error);
                  const msg = error?.message || "Erro ao carregar o formulário";
                  setErrorMessage(msg);
                  toast({ title: "Erro", description: msg, variant: "destructive" });
                  onError?.();
                }}
              />
            </div>
          </div>
          {processing && (
            <div className="text-center p-2 text-sm">
              <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
              Processando pagamento...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MercadoPagoCardBrick;
