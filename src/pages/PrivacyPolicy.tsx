
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mr-3"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">Política de Privacidade</h1>
      </div>

      <div className="prose prose-sm max-w-none space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-3">Política de Privacidade do iParty</h2>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">1. Introdução</h3>
          <p className="text-gray-700 leading-relaxed">
            Bem-vindo ao iParty! Sua privacidade é muito importante para nós. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza nosso site e nossos serviços.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">2. Dados que Coletamos</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>2.1. Dados Pessoais:</strong> nome, endereço de e‑mail, telefone, CPF/CNPJ, dados de login e autenticação.</p>
            <p><strong>2.2. Dados de Perfil:</strong> foto de perfil, informações do espaço/evento, localização, preferências.</p>
            <p><strong>2.3. Dados de Pagamento:</strong> informações de cartão de crédito/débito (tokenizadas via Mercado Pago), histórico de transações.</p>
            <p><strong>2.4. Dados de Uso:</strong> IP, tipo de navegador, páginas acessadas, horários de acesso, comportamento no site.</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">3. Finalidades do Tratamento</h3>
          <p className="text-gray-700 mb-2">Utilizamos seus dados para:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            <li>Criar e gerenciar sua conta;</li>
            <li>Disponibilizar funcionalidades de busca, reserva e promoção de espaços;</li>
            <li>Processar pagamentos e emitir comprovantes;</li>
            <li>Enviar notificações e comunicações sobre seu espaço/evento;</li>
            <li>Melhorar nossos serviços e personalizar sua experiência;</li>
            <li>Atender obrigações legais e de segurança.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">4. Compartilhamento de Dados</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>4.1. Parceiros de Pagamento:</strong> supreendam apenas tokens de pagamento para processamentos via Mercado Pago, sem armazenar números completos.</p>
            <p><strong>4.2. Prestadores de Serviço:</strong> hospedagem, e‑mail marketing e analytics, mediante contratos que garantem confidencialidade.</p>
            <p><strong>4.3. Autoridades:</strong> quando exigido por lei ou ordem judicial.</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">5. Cookies e Tecnologias Semelhantes</h3>
          <p className="text-gray-700 mb-2">Utilizamos cookies, pixels e web beacons para:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            <li>Autenticação e manutenção da sessão;</li>
            <li>Personalização de conteúdo e anúncios;</li>
            <li>Análise de tráfego e comportamento do usuário.</li>
          </ul>
          <p className="text-gray-700 mt-2">
            Você pode desativar cookies no seu navegador, mas algumas funcionalidades podem ficar indisponíveis.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">6. Segurança dos Dados</h3>
          <p className="text-gray-700 leading-relaxed">
            Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração ou destruição, incluindo criptografia, controles de acesso e monitoramento.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">7. Retenção de Dados</h3>
          <p className="text-gray-700 leading-relaxed">
            Reteremos seus dados pelo período necessário para cumprir finalidades descritas (ex.: cobranças, atendimento a reclamações, obrigações fiscais e legais). Após esse prazo, os dados serão anonimizados ou eliminados.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">8. Seus Direitos</h3>
          <p className="text-gray-700 mb-2">
            Você pode exercer, a qualquer momento, direitos previstos na Lei Geral de Proteção de Dados (LGPD), tais como:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            <li>Acesso aos seus dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Eliminação de dados desnecessários;</li>
            <li>Portabilidade;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p className="text-gray-700 mt-2">
            Para solicitar, contate nosso Encarregado de Proteção de Dados.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">9. Encarregado de Proteção de Dados (DPO)</h3>
          <p className="text-gray-700">
            E-mail: <a href="mailto:suporte@ipartybrasil.com.br" className="text-blue-600 underline">suporte@ipartybrasil.com.br</a>
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">10. Alterações nesta Política</h3>
          <p className="text-gray-700 leading-relaxed">
            Podemos atualizar esta Política de Privacidade a qualquer momento. A versão mais recente será indicada pela data de "Última atualização" no início do documento. Recomendamos revisitar periodicamente.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">11. Contato</h3>
          <p className="text-gray-700 mb-2">
            Em caso de dúvidas ou solicitações sobre privacidade, entre em contato conosco em:
          </p>
          <p className="text-gray-700">
            E-mail: <a href="mailto:suporte@ipartybrasil.com.br" className="text-blue-600 underline">suporte@ipartybrasil.com.br</a>
          </p>
        </div>
      </div>

      <div className="mt-8 mb-20">
        <Button 
          onClick={() => navigate(-1)}
          className="w-full"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
