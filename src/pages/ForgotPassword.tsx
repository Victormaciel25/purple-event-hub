
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentDomain } from "@/config/app-config";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Ao submeter o formulário, fazemos:
   * 1) Pegamos o domínio atual (localhost em dev ou domínio de produção)
   * 2) Anexamos "/reset-password" para criar a URL de redirecionamento
   * 3) Chamamos `supabase.auth.resetPasswordForEmail(...)` passando esse redirectTo.
   *
   * No painel do Supabase, você deve ter cadastrado, em:
   *    Authentication → Settings → Configuração de URL → URLs de redirecionamento:
   *      • https://www.ipartybrasil.com/reset-password
   *      • http://localhost:8080/reset-password   (para testes locais)
   *
   * Dessa forma, o link que o Supabase envia por e-mail será:
   * https://<projeto>.supabase.co/auth/v1/verify?
   *   token=XXXXXXXX
   *   &type=recovery
   *   &redirect_to=https://www.ipartybrasil.com/reset-password
   *
   * E o React Router irá agarrar essa rota `/reset-password`,
   * exibindo a tela de ResetPassword.tsx, em vez de cair na homepage ou 404.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Qual domínio estamos? (localhost dev ou produção)
      const domain = getCurrentDomain(); // e.g. "http://localhost:8080" ou "https://www.ipartybrasil.com"
      // 2. Forçamos a rota de redirecionamento exata
      const redirectTo = `${domain}/reset-password`;
      console.log("[ForgotPassword] redirectTo =", redirectTo);

      // 3. Disparamos o e-mail de recuperação, passando o redirectTo
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (err: any) {
      console.error("[ForgotPassword] Erro ao enviar e-mail:", err);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível enviar o link de recuperação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Depois que o e-mail já foi enviado, apenas mostramos uma mensagem de confirmação:
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 animate-fade-in">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-32 w-32">
                <img
                  src="/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png"
                  alt="iParty Balloons"
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">E-mail Enviado!</h1>
            <p className="text-muted-foreground mt-2">
              Enviamos um link de recuperação para <strong>{email}</strong>.  
              Siga as instruções para redefinir sua senha.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-iparty" />
            </div>
            <p className="text-gray-600 mb-6">
              Caso não veja na caixa de entrada, verifique a pasta de spam ou lixo eletrônico.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-iparty hover:bg-iparty-dark text-white"
            >
              Voltar para o Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Se ainda não enviamos o e-mail, mostramos o formulário:
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-32 w-32">
              <img
                src="/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png"
                alt="iParty Balloons"
                className="w-full h-full"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Esqueci Minha Senha</h1>
          <p className="text-muted-foreground mt-2">
            Digite seu e-mail para receber um link de recuperação
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <Button
            onClick={() => navigate("/login")}
            variant="ghost"
            className="mb-4 p-0 h-auto hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o Login
          </Button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-iparty hover:bg-iparty-dark text-white"
              disabled={loading}
            >
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Enviando..." : "Enviar Link de Recuperação"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
