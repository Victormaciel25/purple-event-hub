import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Calendar, HelpCircle, Plus, Home, Shield, CheckSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import FavoriteSpaces from "../components/FavoriteSpaces";
import EditProfileDialog from "@/components/EditProfileDialog";
import ProfileHeader from "@/components/profile/ProfileHeader";
import MenuCard from "@/components/profile/MenuCard";
import SignOutButton from "@/components/profile/SignOutButton";

const Profile = () => {
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const navigate = useNavigate();
  const { toast: toastUI } = useToast();
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
      
      toastUI({
        title: "Desconectado",
        description: "Você saiu da sua conta com sucesso",
      });
      
      navigate("/");
    } catch (error: any) {
      toastUI({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    if (!isAdmin && !isSuperAdmin) {
      toast.error("Você não tem permissões de administrador");
      return;
    }
    
    navigate("/space-approval");
  };
  
  const handleSuperAdminAccess = () => {
    if (!isSuperAdmin) {
      toast.error("Você não tem permissões de super administrador");
      return;
    }
    
    navigate("/admin-management");
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
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const handleUpdatePhoto = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !session?.user?.id) {
      return;
    }
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
    
    setLoading(true);
    
    try {
      // Upload the image to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true 
        });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl }
      });
      
      if (updateError) throw updateError;
      
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", session.user.id);
      
      if (profileError) throw profileError;
      
      toast.success("Foto de perfil atualizada com sucesso");
      refreshProfile();
    } catch (error: any) {
      console.error("Error updating profile photo:", error);
      toast.error(error.message || "Erro ao atualizar foto de perfil");
    } finally {
      setLoading(false);
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
      
      toast.success("Foto de perfil removida com sucesso");
      refreshProfile();
    } catch (error: any) {
      console.error("Error deleting profile photo:", error);
      toast.error(error.message || "Erro ao remover foto de perfil");
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
      label: "Cadastrar espaço", 
      onClick: () => navigate("/register-space") 
    },
    { 
      icon: Plus, 
      label: "Cadastrar fornecedor" 
    },
    { 
      icon: Home, 
      label: "Meus espaços", 
      onClick: () => navigate("/user-spaces") 
    },
    { 
      icon: Shield, 
      label: "Promover Espaço",
      onClick: () => navigate("/promote-space")
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
    
    if (isSuperAdmin || isDebugUser) {
      adminItems.push({
        icon: Users,
        label: "Administradores",
        onClick: handleSuperAdminAccess,
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
      icon: Calendar, 
      label: "Meus Eventos" 
    },
    { 
      icon: HelpCircle, 
      label: "Ajuda e Suporte" 
    }
  ];

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <ProfileHeader 
        firstName={firstName}
        lastName={lastName}
        email={session?.user?.email}
        avatarUrl={avatarUrl}
        onEditProfile={() => setShowEditProfile(true)}
        onUpdatePhoto={handleUpdatePhoto}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Hidden file input for photo upload */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
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
      ) : (
        <>
          <MenuCard items={spaceManagementItems} />
          
          {adminItems.length > 0 && (
            <MenuCard items={adminItems} />
          )}
          
          <MenuCard items={userItems} />
          
          {/* Sign Out Button - Make sure it's visible */}
          <div className="mt-6 mb-20">
            <SignOutButton onSignOut={handleSignOut} loading={loading} />
          </div>
        </>
      )}

      <EditProfileDialog
        open={showEditProfile}
        onOpenChange={setShowEditProfile}
        userId={userId}
        onProfileUpdated={refreshProfile}
      />
    </div>
  );
};

export default Profile;
