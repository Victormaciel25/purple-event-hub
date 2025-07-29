
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("[ForgotPassword] Starting password reset process for:", email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("[ForgotPassword] Supabase error:", error);
        throw error;
      }

      console.log("[ForgotPassword] Password reset request sent successfully");
      setEmailSent(true);
      
      toast({
        title: "Link enviado!",
        description: "Verifique seu email para o link de redefinição de senha.",
      });
      
    } catch (err: any) {
      console.error("[ForgotPassword] Error:", err);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível enviar o link de recuperação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            Digite seu e-mail para receber um link de recuperação.
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
