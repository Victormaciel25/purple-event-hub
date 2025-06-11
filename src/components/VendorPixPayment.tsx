import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, QrCode } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type VendorPixPaymentProps = {
  vendorId: string;
  vendorName: string;
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

const VendorPixPayment: React.FC<VendorPixPaymentProps> = ({
  vendorId,
  vendorName,
  plan,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string | null>(null);
  const [identificationTypes, setIdentificationTypes] = useState<Array<{id: string, name: string}>>([]);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const paymentCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const formCheckoutRef = useRef<HTMLFormElement>(null);
  const pixCodeInputRef = useRef<HTMLInputElement>(null);

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
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao obter chave de pagamento"
          });
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
        initializeMercadoPago();
      };
      script.onerror = () => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar o Mercado Pago"
        });
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    } else {
      initializeMercadoPago();
    }
    
    return () => {
      // Remove the script if we created it
      if (script) {
        script.remove();
      }
    };
  }, [mercadoPagoPublicKey]);

  // Initialize Mercado Pago and get identification types
  const initializeMercadoPago = async () => {
    if (!mercadoPagoPublicKey) return;
    
    try {
      // @ts-ignore - MercadoPago is loaded dynamically
      const mp = new window.MercadoPago(mercadoPagoPublicKey);
      
      // Get identification types
      const fetchedTypes = await mp.getIdentificationTypes();
      setIdentificationTypes(fetchedTypes);
      
      console.log("Identification types loaded:", fetchedTypes);
      
      // Manually populate the select element
      const identificationTypeElement = document.getElementById('form-checkout__identificationType');
      if (identificationTypeElement) {
        createSelectOptions(identificationTypeElement, fetchedTypes);
      }
    } catch (error) {
      console.error("Error initializing Mercado Pago:", error);
      setErrorMessage("Erro ao inicializar o serviço de pagamento");
    }
  };

  // Helper function to create select options
  const createSelectOptions = (elem: HTMLElement, options: Array<{id: string, name: string}>, labelsAndKeys = { label: "name", value: "id" }) => {
    const { label, value } = labelsAndKeys;
    const selectElem = elem as HTMLSelectElement;
    
    // Clear existing options
    selectElem.options.length = 0;
    
    // Create a document fragment to improve performance
    const tempOptions = document.createDocumentFragment();
    
    // Add a default "Select" option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Selecione";
    tempOptions.appendChild(defaultOption);
    
    // Add options from API
    options.forEach(option => {
      const optValue = option[value as keyof typeof option];
      const optLabel = option[label as keyof typeof option];
      
      const opt = document.createElement('option');
      opt.value = optValue as string;
      opt.textContent = optLabel as string;
      
      tempOptions.appendChild(opt);
    });
    
    // Append all options at once
    selectElem.appendChild(tempOptions);
  };

  const startPaymentStatusPolling = (paymentId: string) => {
    console.log("Starting payment status polling for payment ID:", paymentId);
    setCheckingPayment(true);
    
    // Check immediately
    checkPaymentStatus(paymentId);
    
    // Then check every 5 seconds
    paymentCheckInterval.current = setInterval(() => {
      checkPaymentStatus(paymentId);
    }, 5000);
    
    // Stop checking after 10 minutes
    setTimeout(() => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
        setCheckingPayment(false);
        toast({
          title: "Tempo limite",
          description: "Verificação de pagamento interrompida. Por favor, verifique manualmente.",
          variant: "default"
        });
      }
    }, 600000); // 10 minutes
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          payment_id: paymentId,
          entity_type: 'vendor'
        }
      });

      if (error) throw error;

      console.log("Payment status check result:", data);

      if (data.payment_status === 'approved') {
        // Payment approved!
        if (paymentCheckInterval.current) {
          clearInterval(paymentCheckInterval.current);
        }
        setCheckingPayment(false);
        
        toast({
          title: "Sucesso!",
          description: "Pagamento confirmado com sucesso!",
          variant: "default"
        });

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
      }
    };
  }, []);

  // Process PIX payment
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios"
        });
        setShowForm(true);
        setProcessingPayment(false);
        setLoading(false);
        return;
      }

      // Call the process-payment edge function with PIX method for vendor
      const response = await supabase.functions.invoke('process-payment', {
        body: JSON.stringify({
          payment_method_id: "pix",
          transaction_amount: plan.price,
          description: `Promoção: ${vendorName} - ${plan.name}`,
          payer: {
            email,
            first_name: payerFirstName,
            last_name: payerLastName,
            identification: {
              type: identificationType,
              number: identificationNumber
            }
          },
          vendor_id: vendorId, // Use vendor_id instead of space_id
          plan_id: plan.id,
          user_id: userId
        })
      });

      if (response.error) {
        throw new Error(response.error.message || "Error processing payment");
      }

      const paymentData = response.data;
      console.log("Payment data received:", paymentData);
      
      if (paymentData.point_of_interaction && 
          paymentData.point_of_interaction.transaction_data) {
        
        const txData = paymentData.point_of_interaction.transaction_data;
        setPixCode(txData.qr_code);
        setPaymentId(paymentData.id);
        
        // Log QR code data for debugging
        console.log("QR Code received:", txData.qr_code);
        console.log("QR Code Base64 received:", txData.qr_code_base64 ? "Yes (length: " + txData.qr_code_base64.length + ")" : "No");
        
        // Set QR code from base64 if available
        if (txData.qr_code_base64) {
          setQrCodeBase64(txData.qr_code_base64);
        } else {
          // If no base64 QR code, use a generated one
          setPixQrCodeUrl(`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(txData.qr_code)}&choe=UTF-8`);
        }
        
        setShowQrCode(true);
        
        // Start polling for payment status
        startPaymentStatusPolling(paymentData.id);
      } else {
        // If we're in test mode, we might not get a real QR code
        // Show the test QR code instead
        console.log("No QR code in response, using test QR code");
        setPixCode("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Recipient Name6008BRASILIA62070503***6304A1BC");
        setPixQrCodeUrl("https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Recipient+Name6008BRASILIA62070503***6304A1BC&choe=UTF-8");
        setShowQrCode(true);
        setPaymentId(paymentData.id);
        startPaymentStatusPolling(paymentData.id);
      }
      
      setLoading(false);
      setProcessingPayment(false);
    } catch (error) {
      console.error("Error generating PIX:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar código PIX"
      });
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
    
    // Select the input field content
    if (pixCodeInputRef.current) {
      pixCodeInputRef.current.select();
      navigator.clipboard.writeText(pixCode)
        .then(() => {
          setCopied(true);
          toast({
            title: "Sucesso",
            description: "Código PIX copiado para a área de transferência!"
          });
          setTimeout(() => setCopied(false), 3000);
        })
        .catch((err) => {
          console.error("Error copying text: ", err);
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao copiar código PIX"
          });
        });
    }
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
          <form id="form-checkout" ref={formCheckoutRef} onSubmit={generatePix} className="space-y-4">
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
                  <option value="">Carregando...</option>
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
              <input type="hidden" name="description" id="description" value={`Promoção: ${vendorName} - ${plan.name}`} />
              
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
            ) : (
              <div className="w-[200px] h-[200px]">
                <AspectRatio ratio={1 / 1}>
                  {qrCodeBase64 ? (
                    <img 
                      src={`data:image/png;base64,${qrCodeBase64}`} 
                      alt="PIX QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : pixQrCodeUrl ? (
                    <img 
                      src={pixQrCodeUrl} 
                      alt="PIX QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gray-200">
                      <QrCode size={150} className="text-gray-700" />
                    </div>
                  )}
                </AspectRatio>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold mb-2">Pagamento via PIX</h3>
          <p className="text-sm text-gray-600 mb-6">
            Escaneie o QR code acima ou copie o código PIX no seu aplicativo bancário
          </p>
          
          {pixCode && (
            <div className="w-full mb-6">
              <div className="flex flex-col space-y-2">
                <label htmlFor="copiar" className="text-sm font-medium text-gray-700">
                  Copiar Hash:
                </label>
                <div className="flex items-center">
                  <input
                    ref={pixCodeInputRef}
                    type="text"
                    id="copiar"
                    value={pixCode}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-l-md text-xs sm:text-sm overflow-hidden overflow-ellipsis"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyPixCode}
                    className="rounded-l-none border-l-0"
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
                <p className="text-xs text-gray-500 mt-1">
                  Copie o código acima e cole no seu aplicativo bancário para fazer o pagamento via PIX.
                </p>
              </div>
            </div>
          )}

          <Alert className="mb-4">
            <AlertTitle>
              {checkingPayment ? "Verificando Pagamento..." : "Aguardando Pagamento"}
            </AlertTitle>
            <AlertDescription>
              {checkingPayment ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Verificando status do pagamento automaticamente...
                </div>
              ) : (
                "Após realizar o pagamento, a promoção será ativada automaticamente quando o pagamento for confirmado."
              )}
              {paymentId && (
                <div className="mt-2 text-xs text-gray-500">
                  ID do Pagamento: {paymentId}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => {
              if (paymentCheckInterval.current) {
                clearInterval(paymentCheckInterval.current);
              }
              setCheckingPayment(false);
              setShowQrCode(false);
              setShowForm(true);
              setPixCode(null);
              setPixQrCodeUrl(null);
              setQrCodeBase64(null);
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

export default VendorPixPayment;
