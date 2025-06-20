
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SignOutButtonProps {
  onSignOut: () => void;
  loading: boolean;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut, loading }) => {
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSignOutClick = () => {
    if (loading) return; // Prevent multiple clicks
    setShowConfirmDialog(true);
  };

  const handleSignOut = async () => {
    if (loading) return;
    
    try {
      onSignOut(); // Set loading state in parent
      
      // Clear map data BEFORE signing out
      localStorage.removeItem('last_map_position');
      localStorage.removeItem('current_map_user');
      console.log('🗺️ SIGNOUT: Dados do mapa limpos antes do logout');
      
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
    <>
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center text-destructive"
        onClick={handleSignOutClick}
        disabled={loading}
      >
        <LogOut size={16} className="mr-2" />
        {loading ? "Processando..." : "Sair"}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você realmente deseja sair da sua conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SignOutButton;
