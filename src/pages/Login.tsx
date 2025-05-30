import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
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
    
    if (!isLogin && newPassword) {
      const errors = validatePassword(newPassword);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/explore");
        }
      } finally {
        setInitialAuthCheckDone(true);
      }
    };
    
    checkUser();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only handle navigation when a user signs in
        if (event === 'SIGNED_IN' && session) {
          navigate("/explore");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Handle login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login bem-sucedido",
          description: "Bem-vindo de volta!",
        });
        
        // Navigation will be handled by onAuthStateChange
      } else {
        // Handle signup - validate password first
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

        // Using first and last name separately
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
            }
          }
        });

        if (error) throw error;

        // Create profile only after successful signup
        if (data.user) {
          const userId = data.user.id;
          
          try {
            // First attempt with user's own auth
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                updated_at: new Date().toISOString(),
              });
              
            if (profileError) {
              console.error("Erro ao criar perfil (tentativa 1):", profileError);
              
              // Segunda tentativa: fazer login após o signup para obter novas credenciais
              await supabase.auth.signInWithPassword({
                email,
                password,
              });
              
              // Tentar novamente com as novas credenciais
              const { error: retryError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  first_name: firstName,
                  last_name: lastName,
                  phone: phone,
                  updated_at: new Date().toISOString(),
                });
                
              if (retryError) {
                console.error("Erro ao criar perfil (tentativa 2):", retryError);
                toast({
                  title: "Aviso",
                  description: "Cadastro realizado, mas houve um erro ao salvar seu perfil. Você pode completar seu perfil mais tarde.",
                  variant: "destructive",
                });
              }
            }
          } catch (profileError: any) {
            console.error("Erro ao criar perfil:", profileError);
          }
        }

        toast({
          title: "Cadastro realizado",
          description: "Sua conta foi criada com sucesso!",
        });
        
        // Automatically switch to login view after successful signup
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Return loading state until the initial auth check is complete
  if (!initialAuthCheckDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div>Carregando...</div>
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
          <h1 className="text-3xl font-bold text-foreground">iParty</h1>
          <p className="text-muted-foreground mt-2">
            Encontre o espaço perfeito para seu evento, conecte-se aos melhores fornecedores!
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-center mb-2">
            <div className="flex rounded-lg overflow-hidden border">
              <button
                className={`px-6 py-2 text-sm ${
                  isLogin
                    ? "bg-iparty text-white"
                    : "bg-transparent text-foreground"
                }`}
                onClick={() => setIsLogin(true)}
                type="button"
              >
                Entrar
              </button>
              <button
                className={`px-6 py-2 text-sm ${
                  !isLogin
                    ? "bg-iparty text-white"
                    : "bg-transparent text-foreground"
                }`}
                onClick={() => setIsLogin(false)}
                type="button"
              >
                Cadastrar
              </button>
            </div>
          </div>

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
            
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Seu nome"
                      required={!isLogin}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Seu sobrenome"
                      required={!isLogin}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    required={!isLogin}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={handlePasswordChange}
              />
              {!isLogin && password && (
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
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required={!isLogin}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-iparty hover:bg-iparty-dark text-white"
              disabled={loading || (!isLogin && passwordErrors.length > 0)}
            >
              {isLogin ? (
                <LogIn className="mr-2 h-4 w-4" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
