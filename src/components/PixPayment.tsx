
import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, QrCode } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type PixPaymentProps = {
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

const PixPayment: React.FC<PixPaymentProps> = ({
  spaceId,
  spaceName,
  plan,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);

  // Get user ID and Mercado Pago public key on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        }
        
        // Fetch Mercado Pago public key from edge function
        const { data: mpKeyData, error } = await supabase.functions.invoke('get-mercado-pago-public-key');
        
        if (error) {
          console.error("Error fetching Mercado Pago public key:", error);
          toast.error("Erro ao obter chave de pagamento");
          setErrorMessage("Não foi possível se conectar ao serviço de pagamento. Tente novamente mais tarde.");
          return;
        }
        
        if (mpKeyData && mpKeyData.public_key) {
          setMercadoPagoPublicKey(mpKeyData.public_key);
        } else {
          console.error("Public key not found in response");
          setErrorMessage("Configuração de pagamento incompleta");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Erro ao inicializar o checkout");
      }
    };
    
    initialize();
  }, []);

  // Load Mercado Pago SDK
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    if (!window.MercadoPago) {
      script = document.createElement('script');
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        console.log("Mercado Pago SDK loaded successfully");
      };
      script.onerror = () => {
        toast.error("Erro ao carregar o Mercado Pago");
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    }
    
    return () => {
      // Remove the script if we created it
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Simulate PIX code generation - in a real app, you would get this from your payment processor
  const generatePix = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      setShowForm(false);
      setProcessingPayment(true);
      
      // Get form data
      const formData = new FormData(event.currentTarget);
      const payerFirstName = formData.get('payerFirstName') as string;
      const payerLastName = formData.get('payerLastName') as string;
      const email = formData.get('email') as string;
      const identificationType = formData.get('identificationType') as string;
      const identificationNumber = formData.get('identificationNumber') as string;
      
      // Validate form data
      if (!payerFirstName || !payerLastName || !email || !identificationType || !identificationNumber) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        setShowForm(true);
        setProcessingPayment(false);
        setLoading(false);
        return;
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // This would be replaced with actual PIX generation from your payment processor
      setPixCode("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Recipient Name6008BRASILIA62070503***6304A1BC");
      setPixQrCodeUrl("https://via.placeholder.com/300x300?text=PIX+QR+CODE");
      
      setShowQrCode(true);
      setLoading(false);
      setProcessingPayment(false);
    } catch (error) {
      console.error("Error generating PIX:", error);
      toast.error("Erro ao gerar código PIX");
      setErrorMessage("Não foi possível gerar o código PIX. Por favor, tente novamente mais tarde.");
      setLoading(false);
      setProcessingPayment(false);
      setShowForm(true);
      
      if (onError) {
        onError();
      }
    }
  };

  const handleCopyPixCode = () => {
    if (!pixCode) return;
    
    navigator.clipboard.writeText(pixCode)
      .then(() => {
        setCopied(true);
        toast.success("Código PIX copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        toast.error("Erro ao copiar código PIX");
      });
  };

  return (
    <div className="flex flex-col items-center w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4 w-full">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {showForm && !showQrCode && (
        <div className="w-full max-w-md">
          <form id="form-checkout" onSubmit={generatePix} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="form-checkout__payerFirstName" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  id="form-checkout__payerFirstName" 
                  name="payerFirstName" 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="form-checkout__payerLastName" className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                <input 
                  id="form-checkout__payerLastName" 
                  name="payerLastName" 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="form-checkout__email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  id="form-checkout__email" 
                  name="email" 
                  type="email" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="form-checkout__identificationType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                <select 
                  id="form-checkout__identificationType" 
                  name="identificationType" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="RG">RG</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="form-checkout__identificationNumber" className="block text-sm font-medium text-gray-700 mb-1">Número do documento</label>
                <input 
                  id="form-checkout__identificationNumber" 
                  name="identificationNumber" 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
            
            <div>
              <input type="hidden" name="transactionAmount" id="transactionAmount" value={plan.price.toString()} />
              <input type="hidden" name="description" id="description" value={`Promoção: ${spaceName} - ${plan.name}`} />
              
              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={loading || processingPayment}
              >
                {loading || processingPayment ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Gerar PIX"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {showQrCode && (
        <div className="flex flex-col items-center text-center p-6">
          <div className="bg-gray-100 p-8 rounded-lg mb-6 relative">
            {loading ? (
              <Loader2 size={80} className="animate-spin text-iparty" />
            ) : pixQrCodeUrl ? (
              <img src={pixQrCodeUrl} alt="PIX QR Code" className="w-[200px] h-[200px]" />
            ) : (
              <QrCode size={150} className="text-gray-700" />
            )}
          </div>

          <h3 className="text-lg font-bold mb-2">Pagamento via PIX</h3>
          <p className="text-sm text-gray-600 mb-6">
            Escaneie o QR code acima ou copie e cole o código PIX no seu aplicativo bancário
          </p>
          
          {pixCode && (
            <div className="w-full mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
                <code className="text-xs sm:text-sm overflow-hidden overflow-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-[300px]">
                  {pixCode}
                </code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyPixCode}
                  className="ml-2 min-w-[100px]"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Copie o código acima e cole no seu aplicativo bancário para fazer o pagamento via PIX.
              </p>
            </div>
          )}

          <Button
            onClick={() => {
              setShowQrCode(false);
              setShowForm(true);
              setPixCode(null);
              setPixQrCodeUrl(null);
            }}
            variant="outline"
            className="mt-2"
          >
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
};

export default PixPayment;
