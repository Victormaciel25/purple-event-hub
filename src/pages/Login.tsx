
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, LogIn, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/explore");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-iparty flex items-center justify-center">
              <User size={40} className="text-white" />
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
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
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-iparty hover:bg-iparty-dark text-white"
            >
              {isLogin ? (
                <LogIn className="mr-2 h-4 w-4" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isLogin ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
