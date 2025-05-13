
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { MERCADO_PAGO_CONFIG } from '@/config/app-config';
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
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUserId(data.session.user.id);
      }
    };
    
    getUserId();
  }, []);
  
  // Load Mercado Pago SDK
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    if (!window.MercadoPago) {
      script = document.createElement('script');
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        setSdkReady(true);
        console.log("Mercado Pago SDK loaded successfully");
      };
      script.onerror = () => {
        toast.error("Erro ao carregar o Mercado Pago");
        console.error("Failed to load Mercado Pago SDK");
      };
      document.body.appendChild(script);
    } else {
      setSdkReady(true);
    }
    
    return () => {
      // Cleanup if component unmounts
      cleanupMercadoPagoElements();
      
      // Remove the script if we created it
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleShowCheckout = async () => {
    if (!sdkReady) {
      toast.error("Mercado Pago ainda está carregando. Por favor, aguarde.");
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Você precisa estar logado para realizar um pagamento.");
        return;
      }
      setUserId(data.session.user.id);
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Show the payment form
      setShowCheckoutForm(true);
      
      // Initialize the form after a small delay to ensure DOM is ready
      setTimeout(() => {
        initializePaymentForm();
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erro ao iniciar o checkout. Tente novamente.");
      
      setErrorMessage("Não foi possível iniciar o checkout. Por favor, tente novamente mais tarde.");
      
      if (onError) {
        onError();
      }
      setLoading(false);
    }
  };
  
  const initializePaymentForm = () => {
    try {
      const mp = new window.MercadoPago(MERCADO_PAGO_CONFIG.PUBLIC_KEY);
      
      // Remove any existing styles to avoid duplicates
      const existingStyles = document.getElementById('mp-form-styles');
      if (existingStyles) {
        existingStyles.remove();
      }
      
      // Create styles for the form
      const formStyles = document.createElement('style');
      formStyles.id = 'mp-form-styles';
      formStyles.textContent = `
        #form-checkout {
          display: flex;
          flex-direction: column;
          max-width: 600px;
          gap: 16px;
          margin: 0 auto;
        }
        
        .container {
          height: 40px;
          display: block;
          border: 1px solid rgb(209, 213, 219);
          border-radius: 0.375rem;
          padding: 8px 12px;
          font-size: 16px;
          width: 100%;
          background-color: white;
        }
        
        .form-control {
          height: 40px;
          display: block;
          border: 1px solid rgb(209, 213, 219);
          border-radius: 0.375rem;
          padding: 8px 12px;
          font-size: 16px;
          width: 100%;
        }
        
        .form-group {
          margin-bottom: 12px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.7);
        }
        
        #form-checkout__submit {
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
        
        #form-checkout__submit:hover {
          background-color: rgb(126, 34, 206);
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          margin-top: 16px;
        }
        
        /* Remove any overlays that Mercado Pago might create */
        .mercadopago-overlay {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(formStyles);
      
      // Create the payment form HTML
      const paymentFormContainer = document.getElementById('payment-form-container');
      if (!paymentFormContainer) {
        console.error("Payment form container not found");
        return;
      }
      
      paymentFormContainer.innerHTML = `
        <form id="form-checkout">
          <div class="form-group">
            <label for="form-checkout__cardNumber">Número do Cartão</label>
            <div id="form-checkout__cardNumber" class="container"></div>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__cardholderName">Titular do Cartão</label>
            <input type="text" id="form-checkout__cardholderName" class="form-control" />
          </div>
          
          <div class="form-group">
            <label for="form-checkout__cardholderEmail">E-mail</label>
            <input type="email" id="form-checkout__cardholderEmail" class="form-control" />
          </div>
          
          <div style="display: flex; gap: 16px;">
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__expirationDate">Data de Validade</label>
              <div id="form-checkout__expirationDate" class="container"></div>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__securityCode">CVV</label>
              <div id="form-checkout__securityCode" class="container"></div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__issuer">Banco Emissor</label>
            <select id="form-checkout__issuer" class="form-control"></select>
          </div>
          
          <div class="form-group">
            <label for="form-checkout__installments">Parcelas</label>
            <select id="form-checkout__installments" class="form-control"></select>
          </div>
          
          <div style="display: flex; gap: 16px;">
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__identificationType">Tipo de Documento</label>
              <select id="form-checkout__identificationType" class="form-control"></select>
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label for="form-checkout__identificationNumber">Número do Documento</label>
              <input type="text" id="form-checkout__identificationNumber" class="form-control" />
            </div>
          </div>
          
          <button type="submit" id="form-checkout__submit">Pagar</button>
          <progress value="0" class="progress-bar" id="payment-progress">Carregando...</progress>
        </form>
      `;
      
      // Initialize Mercado Pago card form
      const cardForm = mp.cardForm({
        amount: plan.price.toString(),
        iframe: true,
        form: {
          id: "form-checkout",
          cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Número do cartão",
          },
          expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YY",
          },
          securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Código de segurança",
          },
          cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Titular do cartão",
          },
          issuer: {
            id: "form-checkout__issuer",
            placeholder: "Banco emissor",
          },
          installments: {
            id: "form-checkout__installments",
            placeholder: "Parcelas",
          },        
          identificationType: {
            id: "form-checkout__identificationType",
            placeholder: "Tipo de documento",
          },
          identificationNumber: {
            id: "form-checkout__identificationNumber",
            placeholder: "Número do documento",
          },
          cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
          },
        },
        callbacks: {
          onFormMounted: error => {
            if (error) return console.warn("Form Mounted handling error: ", error);
            console.log("Form mounted");
          },
          onSubmit: async event => {
            event.preventDefault();
            
            if (processingPayment) return;
            setErrorMessage(null);
            
            const progressBar = document.querySelector<HTMLProgressElement>("#payment-progress");
            if (progressBar) progressBar.removeAttribute("value");
            
            setProcessingPayment(true);

            try {
              const formData = cardForm.getCardFormData();
              console.log("Payment form data:", formData);
              
              if (!userId) {
                throw new Error("Usuário não identificado. Faça login novamente.");
              }

              // Process payment through Supabase Edge Function
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
                  user_id: userId
                })
              });
              
              if (error) {
                console.error("Payment function error:", error);
                throw new Error("Erro na comunicação com o servidor de pagamentos");
              }
              
              if (data && data.success) {
                toast.success(`Pagamento realizado com sucesso!`, {
                  duration: 5000,
                });

                // Clean up Mercado Pago elements after payment
                cleanupMercadoPagoElements();
                
                if (onSuccess) {
                  onSuccess();
                }
              } else {
                const errorMsg = data?.error || "Ocorreu um erro ao processar o pagamento.";
                setErrorMessage(errorMsg);
                throw new Error(errorMsg);
              }
            } catch (error) {
              console.error("Payment processing error:", error);
              
              const errorMsg = error instanceof Error ? error.message : "Erro ao processar pagamento. Verifique os dados do cartão.";
              toast.error(errorMsg);
              setErrorMessage(errorMsg);
              
              if (onError) {
                onError();
              }
            } finally {
              if (progressBar) progressBar.setAttribute("value", "0");
              setProcessingPayment(false);
            }
          },
          onFetching: (resource) => {
            console.log("Fetching resource: ", resource);
            
            // Animate progress bar
            const progressBar = document.querySelector<HTMLProgressElement>(".progress-bar");
            if (progressBar) progressBar.removeAttribute("value");
            
            return () => {
              if (progressBar) progressBar.setAttribute("value", "0");
            };
          }
        },
      });
    } catch (error) {
      console.error("Error initializing payment form:", error);
      toast.error("Erro ao inicializar formulário de pagamento");
      setErrorMessage("Não foi possível carregar o formulário de pagamento. Por favor, tente novamente mais tarde.");
    }
  };
  
  // Helper function to clean up Mercado Pago elements
  const cleanupMercadoPagoElements = () => {
    // Remove any hidden inputs that Mercado Pago might have added
    const hiddenInputs = document.querySelectorAll('[id^="MPHidden"]');
    hiddenInputs.forEach((element) => {
      element.remove();
    });
    
    // Remove any iframes that Mercado Pago might have created
    const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
    mpIframes.forEach((iframe) => {
      iframe.remove();
    });
    
    // Remove any styles that might have been added
    const formStyles = document.getElementById('mp-form-styles');
    if (formStyles) {
      formStyles.remove();
    }
    
    // Remove any overlay elements that might have been created
    const overlays = document.querySelectorAll('.mercadopago-overlay');
    overlays.forEach((element) => {
      element.remove();
    });
    
    // Reset the payment form container
    const formContainer = document.getElementById('payment-form-container');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
  };

  return (
    <div className="flex flex-col w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro no processamento</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {!showCheckoutForm ? (
        <Button 
          size="lg"
          onClick={handleShowCheckout}
          disabled={loading || !sdkReady}
          className="bg-iparty"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Carregando formulário de pagamento...
            </>
          ) : (
            <>
              <Check size={20} className="mr-2" />
              Continuar para o pagamento
            </>
          )}
        </Button>
      ) : null}
      
      <div id="payment-form-container" className="mt-6"></div>
    </div>
  );
};

export default MercadoPagoCheckout;
