
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Check, AlertCircle, Eye, EyeOff, Mail, ArrowRight } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showEmailExistsOptions, setShowEmailExistsOptions] = useState(false);
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

  // Check if error indicates email already exists
  const isEmailAlreadyExistsError = (errorMessage: string): boolean => {
    const existingEmailPatterns = [
      "User already registered",
      "Email address already registered",
      "Email already exists",
      "already registered",
      "email already in use",
      "duplicate email",
      "email exists"
    ];
    
    return existingEmailPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Check if error indicates rate limit exceeded
  const isRateLimitError = (errorMessage: string): boolean => {
    const rateLimitPatterns = [
      "email rate limit exceeded",
      "too many requests",
      "rate limit",
      "try again later"
    ];
    
    return rateLimitPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Handle email change to clear errors
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError("");
    setShowEmailExistsOptions(false);
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

  // Handle switch to login mode
  const handleSwitchToLogin = () => {
    setIsLogin(true);
    setPassword("");
    setConfirmPassword("");
    setPasswordErrors([]);
    setEmailError("");
    setShowEmailExistsOptions(false);
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    navigate("/forgot-password");
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
    setEmailError("");
    setShowEmailExistsOptions(false);

    try {
      if (isLogin) {
        // Handle login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.log("Login error:", error.message);
          
          let errorMessage = "Erro ao fazer login";
          
          if (error.message.includes("Invalid login credentials")) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              errorMessage = "Email incorreto ou inválido";
            } else {
              errorMessage = "Senha incorreta";
            }
          } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login";
          } else {
            errorMessage = error.message;
          }

          toast({
            title: "Erro no login",
            description: errorMessage,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

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

        console.log("Attempting signup for email:", email);

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
            }
          }
        });

        if (error) {
          console.log("Signup error:", error.message);
          
          // Enhanced error handling for existing email
          if (isEmailAlreadyExistsError(error.message)) {
            setEmailError("Este email já está cadastrado");
            setShowEmailExistsOptions(true);
            
            toast({
              title: "Email já cadastrado",
              description: "Este email já possui uma conta. Faça login ou use outro email.",
              variant: "destructive",
            });
            
            setLoading(false);
            return;
          }
          
          // Handle rate limit error
          if (isRateLimitError(error.message)) {
            toast({
              title: "Muitas tentativas",
              description: "Limite de envio de emails excedido. Aguarde alguns minutos antes de tentar novamente.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          
          // Handle other signup errors
          let errorMessage = "Erro ao criar conta";
          
          if (error.message.includes("Signup is disabled")) {
            errorMessage = "Cadastro temporariamente desabilitado. Tente novamente mais tarde.";
          } else {
            errorMessage = error.message;
          }

          toast({
            title: "Erro no cadastro",
            description: errorMessage,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("Signup successful for email:", email);

        // Check if user needs to confirm email
        if (data.user && !data.session) {
          toast({
            title: "Cadastro realizado com sucesso!",
            description: "Verifique seu email para confirmar sua conta. Após a confirmação, você poderá fazer login.",
          });
        } else {
          toast({
            title: "Cadastro realizado com sucesso!",
            description: "Sua conta foi criada e você está logado!",
          });
        }
        
        // Switch to login view after successful signup
        setIsLogin(true);
      }
    } catch (error: any) {
      console.log("Catch error:", error.message);
      
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 scrollbar-hide">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 scrollbar-hide">
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
                onChange={handleEmailChange}
                className={emailError ? "border-red-500 focus:border-red-500" : ""}
              />
              {emailError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle size={16} />
                  <span>{emailError}</span>
                </div>
              )}
              {showEmailExistsOptions && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <Mail size={16} />
                    <span className="font-medium">Este email já possui uma conta</span>
                  </div>
                  <p className="text-sm text-red-600">
                    Você pode fazer login com este email ou usar outro email para criar uma nova conta.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSwitchToLogin}
                      className="flex items-center gap-2 bg-iparty hover:bg-iparty-dark"
                    >
                      <LogIn size={14} />
                      Fazer Login
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleForgotPassword}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight size={14} />
                      Esqueci minha senha
                    </Button>
                  </div>
                </div>
              )}
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
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

            {isLogin && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-iparty hover:text-iparty-dark text-sm"
                  onClick={() => navigate("/forgot-password")}
                >
                  Esqueci minha senha
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
