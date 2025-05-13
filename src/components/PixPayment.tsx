
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

  useEffect(() => {
    // Simulate PIX code generation - in a real app, you would get this from your payment processor
    // This is a placeholder for the feature that's "in development"
    const generatePix = async () => {
      try {
        setLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // This would be replaced with actual PIX generation from your payment processor
        setPixCode("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Recipient Name6008BRASILIA62070503***6304A1BC");
        setPixQrCodeUrl("https://via.placeholder.com/300x300?text=PIX+QR+CODE");
        
        setLoading(false);
      } catch (error) {
        console.error("Error generating PIX:", error);
        toast.error("Erro ao gerar código PIX");
        setErrorMessage("Não foi possível gerar o código PIX. Por favor, tente novamente mais tarde.");
        setLoading(false);
        
        if (onError) {
          onError();
        }
      }
    };
    
    // Uncomment when implementing the actual PIX functionality
    // generatePix();
  }, [onError]);

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

      <div className="flex flex-col items-center text-center p-6">
        <div className="bg-gray-100 p-8 rounded-lg mb-6 relative">
          {loading ? (
            <Loader2 size={80} className="animate-spin text-iparty" />
          ) : (
            <QrCode size={150} className="text-gray-700" />
          )}
        </div>

        <h3 className="text-lg font-bold mb-2">Pagamento via PIX</h3>
        <p className="text-sm text-gray-600 mb-6">
          Este método de pagamento está em desenvolvimento. Em breve você poderá pagar por PIX!
        </p>
        
        {/* Uncomment when implementing the actual PIX functionality */}
        {/* {pixCode && (
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
        )} */}

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-2"
        >
          Tentar novamente mais tarde
        </Button>
      </div>
    </div>
  );
};

export default PixPayment;
