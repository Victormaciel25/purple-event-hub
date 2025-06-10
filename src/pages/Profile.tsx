import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, HelpCircle, Plus, Home, Shield, CheckSquare, Users, Briefcase, Clipboard, FileText, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import FavoriteSpaces from "../components/FavoriteSpaces";
import EditProfileDialog from "@/components/EditProfileDialog";
import ProfileHeader from "@/components/profile/ProfileHeader";
import MenuCard from "@/components/profile/MenuCard";
import SignOutButton from "@/components/profile/SignOutButton";
import RegistrationOptions from "@/components/profile/RegistrationOptions";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Profile = () => {
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [alert, setAlert] = useState<{message: string, type: 'success' | 'error' | 'info' | null}>({
    message: '',
    type: null
  });
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading, userId } = useUserRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        console.log("Profile data loaded:", profileData);
      }
      
      setLoading(false);
    };

    fetchProfile();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "SIGNED_OUT") {
          navigate("/", { replace: true });
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
    if (signingOut) return; // Prevent multiple sign-out attempts
    
    setSigningOut(true);
    try {
      // First check if we still have a valid session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // No session found, just redirect to login
        setAlert({
          message: "Sua sessão expirou. Redirecionando para login.",
          type: 'info'
        });
        
        navigate("/", { replace: true });
        return;
      }
      
      // We have a session, attempt to sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
      
      setAlert({
        message: "Você saiu da sua conta com sucesso",
        type: 'success'
      });
      
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Sign out error:", error);
      setAlert({
        message: error.message || "Ocorreu um erro ao sair da conta",
        type: 'error'
      });
      
      // If we can't sign out properly, force navigate to login
      if (error.message === "Auth session missing!" || error.message.includes("session")) {
        navigate("/", { replace: true });
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleAdminAccess = () => {
    if (!isAdmin && !isSuperAdmin) {
      setAlert({
        message: "Você não tem permissões de administrador",
        type: 'error'
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => {
        setAlert({ message: '', type: null });
      }, 3000);
      
      return;
    }
    
    navigate("/space-approval");
  };
  
  const handleSuperAdminAccess = () => {
    if (!isSuperAdmin) {
      setAlert({
        message: "Você não tem permissões de super administrador",
        type: 'error'
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => {
        setAlert({ message: '', type: null });
      }, 3000);
      
      return;
    }
    
    navigate("/admin-management");
  };

  const handleSubscriptionsAccess = () => {
    if (!isSuperAdmin) {
      setAlert({
        message: "Você não tem permissões de super administrador",
        type: 'error'
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => {
        setAlert({ message: '', type: null });
      }, 3000);
      
      return;
    }
    
    navigate("/subscriptions-management");
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    
    try {
      // Fetch updated profile data
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
      console.log("Profile refreshed:", data);
      
      setAlert({
        message: "Perfil atualizado com sucesso",
        type: 'success'
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => {
        setAlert({ message: '', type: null });
      }, 3000);
      
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const handleDeletePhoto = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    
    try {
      // Update user metadata with null avatar_url
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });
      
      if (updateError) throw updateError;
      
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", session.user.id);
      
      if (profileError) throw profileError;
      
      setAlert({
        message: "Foto de perfil removida com sucesso",
        type: 'success'
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => {
        setAlert({ message: '', type: null });
      }, 3000);
      
      refreshProfile();
    } catch (error: any) {
      console.error("Error deleting profile photo:", error);
      setAlert({
        message: error.message || "Erro ao remover foto de perfil",
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.first_name || session?.user?.user_metadata?.first_name || '';
  const lastName = profile?.last_name || session?.user?.user_metadata?.last_name || '';
  const avatarUrl = profile?.avatar_url || session?.user?.user_metadata?.avatar_url || null;

  // Renderizar loading quando estiver carregando
  if (loading || roleLoading) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex flex-col items-center justify-center h-[80vh]">
        <p className="mb-4">Carregando...</p>
      </div>
    );
  }

  // Force admin access for known user when debugging
  const isDebugUser = session?.user?.email === "vcr0091@gmail.com";

  // Define menu items for each card
  const spaceManagementItems = [
    { 
      icon: Plus, 
      label: "Cadastrar", 
      onClick: () => setShowRegistration(true)
    },
    { 
      icon: Home, 
      label: "Meus espaços", 
      onClick: () => navigate("/user-spaces") 
    },
    { 
      icon: Clipboard, 
      label: "Meus fornecedores", 
      onClick: () => navigate("/user-vendors") 
    },
    { 
      icon: Shield, 
      label: "Promover",
      onClick: () => navigate("/promote")
    }
  ];

  const adminItems = [];
  if (isAdmin || isSuperAdmin || isDebugUser) {
    adminItems.push({
      icon: CheckSquare,
      label: "Aprovar Espaços",
      onClick: handleAdminAccess,
      iconClassName: "text-red-600"
    });
    
    adminItems.push({
      icon: Briefcase,
      label: "Aprovar Fornecedores",
      onClick: () => navigate("/vendor-approval"),
      iconClassName: "text-red-600"
    });
    
    if (isSuperAdmin || isDebugUser) {
      adminItems.push({
        icon: Users,
        label: "Administradores",
        onClick: handleSuperAdminAccess,
        iconClassName: "text-red-600"
      });
      
      adminItems.push({
        icon: CreditCard,
        label: "Assinaturas",
        onClick: handleSubscriptionsAccess,
        iconClassName: "text-red-600"
      });
    }
  }

  const userItems = [
    { 
      icon: Heart, 
      label: "Favoritos", 
      onClick: () => setShowFavorites(true) 
    },
    { 
      icon: HelpCircle, 
      label: "Ajuda e Suporte",
      onClick: () => navigate("/help-support")
    },
    { 
      icon: FileText, 
      label: "Política de privacidade",
      onClick: () => navigate("/privacy-policy")
    }
  ];

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      {alert.type && (
        <Alert 
          className={`mb-4 ${
            alert.type === 'error' 
              ? 'bg-red-50 border-red-200' 
              : alert.type === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
          }`}
        >
          <AlertDescription 
            className={`${
              alert.type === 'error' 
                ? 'text-red-800' 
                : alert.type === 'success' 
                  ? 'text-green-800' 
                  : 'text-blue-800'
            }`}
          >
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      <ProfileHeader 
        firstName={firstName}
        lastName={lastName}
        email={session?.user?.email}
        avatarUrl={avatarUrl}
        onEditProfile={() => setShowEditProfile(true)}
        onUpdatePhoto={() => {}}
      />

      {showFavorites ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Meus Favoritos</h2>
            <button 
              className="px-4 py-2 border rounded-md text-sm"
              onClick={() => setShowFavorites(false)}
            >
              Voltar
            </button>
          </div>
          <FavoriteSpaces />
        </>
      ) : showRegistration ? (
        <RegistrationOptions onBack={() => setShowRegistration(false)} />
      ) : (
        <>
          <MenuCard items={spaceManagementItems} />
          
          {adminItems.length > 0 && (
            <MenuCard items={adminItems} />
          )}
          
          <MenuCard items={userItems} />
          
          {/* Sign Out Button - Make sure it's visible */}
          <div className="mt-6 mb-20">
            <SignOutButton 
              onSignOut={handleSignOut} 
              loading={signingOut}
            />
          </div>
        </>
      )}

      <EditProfileDialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        userId={userId}
        onProfileUpdated={refreshProfile}
        onDeletePhoto={handleDeletePhoto}
      />
    </div>
  );
};

export default Profile;
