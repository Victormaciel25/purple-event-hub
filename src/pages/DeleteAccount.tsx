
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
import { ArrowLeft, AlertTriangle, Trash2, Loader2 } from "lucide-react";
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
      // Get current session to get the access token
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error("Sessão não encontrada. Faça login novamente.");
        navigate("/login");
        return;
      }

      console.log("Iniciando exclusão da conta...");

      // Call the edge function to delete the user account
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Erro na função de exclusão:", error);
        throw new Error(error.message || "Erro ao excluir conta");
      }

      console.log("Resposta da função:", data);

      if (data?.success) {
        toast.success("Conta excluída com sucesso");
        // Clear any local storage
        localStorage.clear();
        sessionStorage.clear();
        // Navigate to home
        navigate("/", { replace: true });
      } else {
        throw new Error(data?.error || "Erro desconhecido ao excluir conta");
      }
      
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Erro ao excluir conta. Tente novamente.");
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
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Promoções e assinaturas
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
                disabled={loading}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={loading}
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
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      "Excluir Conta"
                    )}
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
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        "Sim, excluir conta"
                      )}
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
