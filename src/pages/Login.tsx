import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Check } from "lucide-react";
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
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Session check on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        setInitialAuthCheck(true);
        const { data } = await supabase.auth.getSession();

        if (isMounted && data.session && !redirecting) {
          setRedirecting(true);
          navigate("/explore", { replace: true });
        }
        if (isMounted) setSessionChecked(true);
      } catch (error) {
        console.error("Error checking session:", error);
        if (isMounted) setSessionChecked(true);
      } finally {
        if (isMounted) setInitialAuthCheck(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [navigate, redirecting]);

  // Auth state change listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session && !redirecting) {
          setRedirecting(true);
          navigate("/explore", { replace: true });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, redirecting]);

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
        // Handle signup
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

  // Show loading state until initial session check completes
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div>Carregando...</div>
      </div>
    );
  }

  // Show loading state while login/signup is processing
  if (initialAuthCheck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div>Verificando autenticação...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
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
            Encontre o espaço perfeito para seu evento
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-center mb-6">
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
                onChange={(e) => setPassword(e.target.value)}
              />
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
              disabled={loading}
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
