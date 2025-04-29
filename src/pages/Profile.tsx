
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Settings, User, Heart, Calendar, HelpCircle, Plus, Home, Shield, CheckSquare, Users } from "lucide-react";
import FavoriteSpaces from "../components/FavoriteSpaces";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";

const Profile = () => {
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin } = useUserRoles();

  useEffect(() => {
    // Check authentication and fetch profile data
    const fetchProfile = async () => {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        navigate("/");
        return;
      }
      
      setSession(sessionData.session);
      
      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.session.user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(profileData);
      }
      
      setLoading(false);
    };

    fetchProfile();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "SIGNED_OUT") {
          navigate("/");
        } else if (newSession && event === "SIGNED_IN") {
          setSession(newSession);
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Desconectado",
        description: "Você saiu da sua conta com sucesso",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="h-24 w-24 bg-purple-400 rounded-full flex items-center justify-center mb-4">
          <User size={50} className="text-white" />
        </div>
        <h2 className="text-xl font-medium">
          {session?.user?.email || "Usuário"}
        </h2>
        <p className="text-muted-foreground">{session?.user?.email}</p>
        <Button variant="outline" className="mt-4 text-sm">
          <Settings size={16} className="mr-2" />
          Editar Perfil
        </Button>
      </div>

      {showFavorites ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Meus Favoritos</h2>
            <Button variant="outline" size="sm" onClick={() => setShowFavorites(false)}>
              Voltar
            </Button>
          </div>
          <FavoriteSpaces />
        </>
      ) : (
        <>
          {/* Novas opções */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div 
                className="p-4 flex items-center cursor-pointer hover:bg-gray-50"
                onClick={() => navigate("/register-space")}
              >
                <Plus size={20} className="text-purple-500 mr-3" />
                <span>Cadastrar espaço</span>
              </div>
              <Separator />
              <div className="p-4 flex items-center">
                <Plus size={20} className="text-purple-500 mr-3" />
                <span>Cadastrar fornecedor</span>
              </div>
              <Separator />
              <div className="p-4 flex items-center">
                <Home size={20} className="text-purple-500 mr-3" />
                <span>Meus espaços</span>
              </div>
              <Separator />
              <div className="p-4 flex items-center">
                <Shield size={20} className="text-purple-500 mr-3" />
                <span>Promover Espaço</span>
              </div>
            </CardContent>
          </Card>

          {/* Admin options */}
          {isAdmin && (
            <Card className="mb-6">
              <CardContent className="p-0">
                <div 
                  className="p-4 flex items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate("/space-approval")}
                >
                  <CheckSquare size={20} className="text-purple-500 mr-3" />
                  <span className="font-medium">Aprovar Espaços</span>
                </div>
                {isSuperAdmin && (
                  <>
                    <Separator />
                    <div 
                      className="p-4 flex items-center cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate("/admin-management")}
                    >
                      <Users size={20} className="text-purple-500 mr-3" />
                      <span className="font-medium">Administradores</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opções existentes */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div 
                className="p-4 flex items-center cursor-pointer hover:bg-gray-50"
                onClick={() => setShowFavorites(true)}
              >
                <Heart size={20} className="text-purple-500 mr-3" />
                <span>Favoritos</span>
              </div>
              <Separator />
              <div className="p-4 flex items-center">
                <Calendar size={20} className="text-purple-500 mr-3" />
                <span>Meus Eventos</span>
              </div>
              <Separator />
              <div className="p-4 flex items-center">
                <HelpCircle size={20} className="text-purple-500 mr-3" />
                <span>Ajuda e Suporte</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center text-red-500"
            onClick={handleSignOut}
            disabled={loading}
          >
            <LogOut size={16} className="mr-2" />
            {loading ? "Processando..." : "Sair"}
          </Button>
        </>
      )}
    </div>
  );
};

export default Profile;
