
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, MessageSquare, CreditCard, AlertTriangle, Lightbulb, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const HelpSupport = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      icon: Lock,
      question: "Como faço para redefinir minha senha?",
      answer: "Acesse a tela de login, clique em \"Esqueci minha senha\" e siga as instruções enviadas para seu e-mail."
    },
    {
      icon: MessageSquare,
      question: "Como posso falar com o proprietário do espaço?",
      answer: "Após selecionar um espaço, utilize o chat interno do app ou whatsapp para tirar dúvidas diretamente com o proprietário."
    },
    {
      icon: CreditCard,
      question: "Meu pagamento não foi aprovado. O que devo fazer?",
      answer: "Confira se os dados do cartão estão corretos ou tente outro método de pagamento. Se o problema persistir, fale com nosso suporte."
    },
    {
      icon: CreditCard,
      question: "Quais formas de pagamento são aceitas?",
      answer: "Aceitamos cartões de crédito e PIX."
    },
    {
      icon: AlertTriangle,
      question: "Como denunciar um comportamento inadequado?",
      answer: "No perfil do usuário ou espaço, utilize a opção \"Denunciar\" e descreva o ocorrido. Nossa equipe irá analisar o caso."
    },
    {
      icon: Lightbulb,
      question: "Tenho uma sugestão para o iParty, como enviar?",
      answer: "Adoramos ouvir novas ideias! Envie sua sugestão pelo e-mail abaixo ou pelo nosso formulário de feedback."
    }
  ];

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          onClick={() => navigate("/profile")}
          variant="ghost"
          className="mb-4 p-0 h-auto hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao perfil
        </Button>
        
        <div className="text-center mb-8">
          <HelpCircle className="h-16 w-16 text-iparty mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Precisa de ajuda?</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Estamos aqui para garantir que sua experiência no iParty seja sempre incrível! 
            Se você tiver qualquer dúvida, problema ou sugestão, confira as opções abaixo 
            ou entre em contato conosco:
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index}>
              <div className="flex items-start space-x-3">
                <faq.icon className="h-5 w-5 text-iparty mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </div>
              </div>
              {index < faqs.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Entre em contato</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Não encontrou a resposta que procura? Nossa equipe de suporte está pronta para ajudar!
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-iparty" />
              <span className="text-sm">E-mail: suporte@ipartybrasil.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4 text-iparty" />
              <span className="text-sm">Horário de atendimento: Segunda a sexta, 9h às 17h</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpSupport;
