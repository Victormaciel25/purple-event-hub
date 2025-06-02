
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, AlertCircle, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [tokensValid, setTokensValid] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função de validação de senha
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("Mínimo de 8 caracteres");
    if (!/[A-Z]/.test(pwd)) errors.push("Pelo menos uma letra maiúscula (A-Z)");
    if (!/[a-z]/.test(pwd)) errors.push("Pelo menos uma letra minúscula (a-z)");
    if (!/[0-9]/.test(pwd)) errors.push("Pelo menos um número (0-9)");
    if (!/[!@#$%^&*]/.test(pwd)) errors.push("Pelo menos um caractere especial (!@#$%^&*)");
    return errors;
  };

  // Atualiza lista de erros conforme usuário digita
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPwd = e.target.value;
    setPassword(newPwd);
    setPasswordErrors(newPwd ? validatePassword(newPwd) : []);
  };

  useEffect(() => {
    // Ao carregar a página, verificamos URL params:
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const type = searchParams.get("type");
    console.log("Tokens recebidos:", { accessToken, refreshToken, type });

    if (!accessToken || !refreshToken || type !== "recovery") {
      setTokensValid(false);
    } else {
      setTokensValid(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Valida requisitos de senha:
      const pwdErrors = validatePassword(password);
      if (pwdErrors.length > 0) {
        toast({
          title: "Senha inválida",
          description: "Por favor, atenda a todos os requisitos de senha",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // 2) Confirma senhas iguais:
      if (password !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 3) Recupera os tokens da URL
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      if (!accessToken || !refreshToken) {
        throw new Error("Tokens de autenticação não encontrados");
      }

      // 4) Seta sessão com os tokens vindos da URL
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;

      // 5) Atualiza a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });
      if (updateError) throw updateError;

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso!",
      });

      // 6) Desloga e redireciona para login
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enquanto não validamos tokens, mostramos um loading simples
  if (tokensValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Verificando link de redefinição…</p>
      </div>
    );
  }

  // Se tokens inválidos, mostramos tela de erro
  if (tokensValid === false) {
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
            <h1 className="text-3xl font-bold text-foreground">Link Inválido</h1>
            <p className="text-muted-foreground mt-2">
              O link de redefinição de senha é inválido ou expirou.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <p className="text-gray-600 mb-6">
              Solicite um novo link de recuperação.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full bg-iparty hover:bg-iparty-dark text-white"
              >
                Solicitar Novo Link
              </Button>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="w-full"
              >
                Voltar para o Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se tokens válidos, exibimos o formulário de reset
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
          <p className="text-muted-foreground mt-2">Crie uma nova senha para sua conta</p>
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
                  <p className="text-xs text-gray-600 mb-2">
                    Crie uma senha forte seguindo estas regras:
                  </p>
                  {[
                    { rule: "Mínimo de 8 caracteres", valid: password.length >= 8 },
                    { rule: "Pelo menos uma letra maiúscula (A-Z)", valid: /[A-Z]/.test(password) },
                    { rule: "Pelo menos uma letra minúscula (a-z)", valid: /[a-z]/.test(password) },
                    { rule: "Pelo menos um número (0-9)", valid: /[0-9]/.test(password) },
                    { rule: "Pelo menos um caractere especial (!@#$%^&*)", valid: /[!@#$%^&*]/.test(password) },
                  ].map(({ rule, valid }, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-xs ${
                        valid ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {valid ? (
                        <Check size={12} className="text-green-600" />
                      ) : (
                        <AlertCircle size={12} className="text-red-500" />
                      )}
                      <span>{rule}</span>
                    </div>
                  ))}
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
