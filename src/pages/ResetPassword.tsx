
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, AlertCircle, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Mínimo de 8 caracteres");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Pelo menos uma letra maiúscula (A-Z)");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Pelo menos uma letra minúscula (a-z)");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Pelo menos um número (0-9)");
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push("Pelo menos um caractere especial (!@#$%^&*)");
    }
    
    return errors;
  };

  // Handle password change with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (newPassword) {
      const errors = validatePassword(newPassword);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  };

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    console.log("Reset password page loaded");
    console.log("Access token present:", !!accessToken);
    console.log("Refresh token present:", !!refreshToken);
    
    if (!accessToken || !refreshToken) {
      toast({
        title: "Link inválido",
        description: "O link de redefinição de senha é inválido ou expirou.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [searchParams, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      const passwordValidationErrors = validatePassword(password);
      if (passwordValidationErrors.length > 0) {
        toast({
          title: "Senha inválida",
          description: "Por favor, atenda a todos os requisitos de senha",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get tokens from URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        throw new Error("Tokens de autenticação não encontrados");
      }

      console.log("Setting session with tokens from URL");

      // Set the session with the tokens from URL
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw sessionError;

      console.log("Session set successfully, updating password");

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso!",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");

    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Redefinir Senha</h1>
          <p className="text-muted-foreground mt-2">
            Crie uma nova senha para sua conta
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
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={handlePasswordChange}
              />
              {password && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-2">
                    Crie uma senha forte seguindo estas regras:
                  </div>
                  <div className="space-y-1">
                    {[
                      { rule: "Mínimo de 8 caracteres", valid: password.length >= 8 },
                      { rule: "Pelo menos uma letra maiúscula (A-Z)", valid: /[A-Z]/.test(password) },
                      { rule: "Pelo menos uma letra minúscula (a-z)", valid: /[a-z]/.test(password) },
                      { rule: "Pelo menos um número (0-9)", valid: /[0-9]/.test(password) },
                      { rule: "Pelo menos um caractere especial (!@#$%^&*)", valid: /[!@#$%^&*]/.test(password) }
                    ].map(({ rule, valid }, index) => (
                      <div key={index} className={`flex items-center gap-2 text-xs ${valid ? 'text-green-600' : 'text-red-500'}`}>
                        {valid ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <AlertCircle size={12} className="text-red-500" />
                        )}
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-iparty hover:bg-iparty-dark text-white"
              disabled={loading || passwordErrors.length > 0}
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
