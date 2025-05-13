
import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, QrCode, Wallet, CreditCard } from "lucide-react";
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
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setUserId(data.session.user.id);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Erro ao inicializar o pagamento PIX");
      }
    };
    
    initialize();
  }, []);

  const handleGeneratePix = async () => {
    try {
      setLoading(true);
      setShowForm(true);
      
      // Check if user is authenticated
      if (!userId) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Você precisa estar logado para realizar um pagamento."
          });
          setLoading(false);
          return;
        }
        setUserId(data.session.user.id);
      }
      
      // In a real implementation, this would call an API to generate a PIX code
      // For now, we'll simulate a delay and then show the form
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create the PIX form HTML
      const pixFormContainer = document.getElementById('pix-form-container');
      if (pixFormContainer) {
        pixFormContainer.innerHTML = `
          <form id="form-checkout" action="/process_payment" method="post">
            <div class="space-y-4">
              <div class="form-group">
                <label for="form-checkout__payerFirstName" class="block text-gray-700 text-sm font-medium mb-1">Nome</label>
                <input id="form-checkout__payerFirstName" name="payerFirstName" type="text" class="w-full p-2 border border-gray-300 rounded" required>
              </div>
              <div class="form-group">
                <label for="form-checkout__payerLastName" class="block text-gray-700 text-sm font-medium mb-1">Sobrenome</label>
                <input id="form-checkout__payerLastName" name="payerLastName" type="text" class="w-full p-2 border border-gray-300 rounded" required>
              </div>
              <div class="form-group">
                <label for="form-checkout__email" class="block text-gray-700 text-sm font-medium mb-1">E-mail</label>
                <input id="form-checkout__email" name="email" type="text" class="w-full p-2 border border-gray-300 rounded" required>
              </div>
              <div class="form-group">
                <label for="form-checkout__identificationType" class="block text-gray-700 text-sm font-medium mb-1">Tipo de documento</label>
                <select id="form-checkout__identificationType" name="identificationType" class="w-full p-2 border border-gray-300 rounded" required>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
              </div>
              <div class="form-group">
                <label for="form-checkout__identificationNumber" class="block text-gray-700 text-sm font-medium mb-1">Número do documento</label>
                <input id="form-checkout__identificationNumber" name="identificationNumber" type="text" class="w-full p-2 border border-gray-300 rounded" required>
              </div>
              
              <div class="bg-gray-100 p-4 rounded-md text-center mb-4">
                <div class="flex justify-center mb-4">
                  <div class="bg-white p-4 rounded-md inline-block">
                    <QrCode size="120" class="mx-auto" />
                  </div>
                </div>
                <p class="text-sm font-medium">Escaneie o QR Code acima com seu aplicativo bancário</p>
                <p class="text-xs text-gray-500 mt-1">ou</p>
                <div class="mt-3">
                  <button type="button" id="copy-pix-code" class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Copiar código PIX
                  </button>
                </div>
              </div>

              <div class="form-group">
                <input type="hidden" name="transactionAmount" id="transactionAmount" value="${plan.price}">
                <input type="hidden" name="description" id="description" value="Promoção do espaço: ${spaceName}">
              </div>
              
              <div class="mt-4 text-center">
                <p class="text-sm text-gray-600 mb-2">
                  Depois de pagar via PIX, clique no botão abaixo para confirmar seu pagamento
                </p>
                <button type="submit" id="form-checkout__submit" class="w-full bg-iparty text-white rounded-md py-2 px-4 font-medium hover:bg-purple-700 transition-colors">
                  Confirmar pagamento de ${plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </button>
              </div>
            </div>
          </form>
        `;

        // Handle the copy button click
        document.getElementById('copy-pix-code')?.addEventListener('click', () => {
          const pixCode = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Recipient Name6008BRASILIA62070503***6304A1BC";
          navigator.clipboard.writeText(pixCode)
            .then(() => {
              toast({
                title: "Código PIX copiado",
                description: "Código PIX copiado para a área de transferência"
              });
            })
            .catch(() => {
              toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível copiar o código PIX"
              });
            });
        });

        // Add form submission handler
        document.getElementById('form-checkout')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          toast({
            title: "Verificando pagamento",
            description: "Estamos verificando seu pagamento PIX"
          });
          
          // In a real implementation, this would call an API to verify the payment
          // For now, we'll just simulate a successful payment after a delay
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
          }, 2000);
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error generating PIX:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar código PIX"
      });
      setErrorMessage("Não foi possível gerar o código PIX. Por favor, tente novamente mais tarde.");
      setLoading(false);
      
      if (onError) {
        onError();
      }
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

      {!showForm ? (
        <Button 
          onClick={handleGeneratePix}
          disabled={loading}
          className="bg-iparty"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="mr-2 animate-spin" />
              Gerando código PIX...
            </>
          ) : (
            <>
              <Wallet size={20} className="mr-2" />
              Gerar código PIX
            </>
          )}
        </Button>
      ) : null}
      
      <div id="pix-form-container" className="w-full mt-4"></div>
    </div>
  );
};

export default PixPayment;
