
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type PixPaymentProps = {
  paymentData: {
    qr_code_base64?: string;
    qr_code?: string;
    ticket_url?: string;
    transaction_id?: string;
  } | null;
  amount: number;
  description: string;
  isLoading: boolean;
};

const PixPayment: React.FC<PixPaymentProps> = ({ 
  paymentData, 
  amount, 
  description, 
  isLoading 
}) => {
  const [copied, setCopied] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyClick = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code)
        .then(() => {
          setCopied(true);
          toast.success("Código PIX copiado com sucesso!");
        })
        .catch((error) => {
          console.error("Erro ao copiar código PIX:", error);
          toast.error("Erro ao copiar o código PIX");
        });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-iparty" />
        <p className="text-center text-gray-700">Gerando pagamento PIX...</p>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <p className="text-center text-gray-700">Nenhuma informação de pagamento disponível.</p>
      </div>
    );
  }

  return (
    <Card className="flex flex-col items-center p-6 space-y-6 max-w-md mx-auto">
      <h3 className="text-xl font-bold text-center">Pagar com PIX</h3>
      
      <div className="text-center mb-2">
        <p className="text-gray-500 mb-1">Valor a pagar:</p>
        <p className="text-2xl font-bold">
          {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>
      
      <div className="text-center mb-2">
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      
      {paymentData.qr_code_base64 && (
        <div className="bg-white p-3 border border-gray-200 rounded-lg">
          <img 
            src={`data:image/jpeg;base64,${paymentData.qr_code_base64}`} 
            alt="QR Code PIX"
            className="w-64 h-64"
          />
        </div>
      )}
      
      {paymentData.qr_code && (
        <div className="w-full">
          <p className="text-sm text-gray-500 mb-1">Copiar código PIX:</p>
          <div className="flex items-center">
            <div className="flex-1 p-3 bg-gray-100 rounded-l-md border border-gray-300 overflow-hidden text-ellipsis text-xs">
              <span className="block truncate">{paymentData.qr_code}</span>
            </div>
            <Button 
              onClick={handleCopyClick}
              className="rounded-l-none bg-iparty h-full"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </Button>
          </div>
        </div>
      )}
      
      {paymentData.ticket_url && (
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 mt-4"
          onClick={() => window.open(paymentData.ticket_url, '_blank')}
        >
          <ExternalLink size={16} />
          Abrir PIX em nova janela
        </Button>
      )}
      
      <div className="bg-blue-50 p-4 rounded-md text-sm w-full">
        <p className="text-blue-800 font-medium mb-2">Instruções:</p>
        <ol className="list-decimal pl-5 text-blue-700 space-y-1">
          <li>Abra o aplicativo do seu banco</li>
          <li>Escolha a opção de pagamento via PIX</li>
          <li>Escaneie o QR code ou cole o código copiado</li>
          <li>Confirme as informações e finalize o pagamento</li>
          <li>Aguarde a confirmação do pagamento (pode levar alguns instantes)</li>
        </ol>
      </div>
    </Card>
  );
};

export default PixPayment;
