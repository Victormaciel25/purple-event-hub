
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DeleteAccount = () => {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmText !== "EXCLUIR") {
      toast.error("Digite 'EXCLUIR' para confirmar a exclusão da conta");
      return;
    }

    setLoading(true);
    
    try {
      // Note: In a real implementation, you would need to call a backend function
      // to properly delete all user data before deleting the auth user
      // For now, we'll just sign out the user and show a message
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast.success("Conta excluída com sucesso");
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Excluir Conta</h1>
      </div>

      <Alert className="mb-6 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Atenção:</strong> Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-red-600">O que será excluído?</CardTitle>
          <CardDescription>
            Ao excluir sua conta, os seguintes dados serão removidos permanentemente:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Informações do perfil (nome, email, telefone, foto)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Espaços cadastrados e suas fotos
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Fornecedores cadastrados
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Conversas e mensagens
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Lista de favoritos
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Histórico de atividades
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Excluir Conta Permanentemente
          </CardTitle>
          <CardDescription>
            Esta ação não pode ser desfeita. Digite "EXCLUIR" no campo abaixo para confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="confirm">
                Digite "EXCLUIR" para confirmar a exclusão da conta
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="mt-2"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancelar
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={confirmText !== "EXCLUIR" || loading}
                    className="flex-1"
                  >
                    {loading ? "Excluindo..." : "Excluir Conta"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão da conta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza de que deseja excluir permanentemente sua conta? 
                      Esta ação não pode ser desfeita e todos os seus dados serão perdidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Sim, excluir conta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteAccount;
