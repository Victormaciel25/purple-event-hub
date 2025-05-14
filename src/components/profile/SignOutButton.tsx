
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignOutButtonProps {
  onSignOut: () => void;
  loading: boolean;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut, loading }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (loading) return; // Prevent multiple clicks
    
    try {
      onSignOut(); // Set loading state in parent
      
      // First check if we have a session
      const { data: sessionData } = await supabase.auth.getSession();
      
      // If no session exists, just redirect to login
      if (!sessionData.session) {
        toast.info("Sessão expirada. Redirecionando para login.");
        navigate("/login", { replace: true });
        return;
      }
      
      // We have a session, try to sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      toast.success("Desconectado com sucesso");
      navigate("/login", { replace: true });
      
    } catch (error: any) {
      console.error("Erro ao sair:", error);
      
      // Handle "Auth session missing" error gracefully
      if (error.message?.includes("session") || error.message === "Auth session missing!") {
        toast.info("Sessão expirada. Redirecionando para login.");
        navigate("/login", { replace: true });
      } else {
        toast.error(error.message || "Erro ao sair da conta");
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center justify-center text-destructive"
      onClick={handleSignOut}
      disabled={loading}
    >
      <LogOut size={16} className="mr-2" />
      {loading ? "Processando..." : "Sair"}
    </Button>
  );
};

export default SignOutButton;
