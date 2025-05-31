import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use the correct redirect URL that matches the route in App.tsx
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      console.log("Sending reset email with redirect URL:", redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast({
        title: "Erro",
        description: error.message,
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
            <h1 className="text-3xl font-bold text-foreground">Email Enviado!</h1>
            <p className="text-muted-foreground mt-2">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-iparty" />
            </div>
            <p className="text-gray-600 mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>
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
          <h1 className="text-3xl font-bold text-foreground">Esqueci minha senha</h1>
          <p className="text-muted-foreground mt-2">
            Digite seu email para receber um link de recuperação
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <Button
            onClick={() => navigate("/login")}
            variant="ghost"
            className="mb-4 p-0 h-auto hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o login
          </Button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
