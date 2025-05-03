
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Loader2, ImagePlus, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  onProfileUpdated: () => void;
}

const EditProfileDialog = ({
  open,
  onOpenChange,
  userId,
  onProfileUpdated,
}: EditProfileDialogProps) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setFetchLoading(true);
    
    try {
      // Get user email from auth
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        setEmail(userData.user.email || "");
        
        // Check if metadata contains user info
        const metadata = userData.user.user_metadata;
        if (metadata && metadata.first_name) {
          setFirstName(metadata.first_name || "");
        }
        if (metadata && metadata.last_name) {
          setLastName(metadata.last_name || "");
        }
        if (metadata && metadata.phone) {
          setPhone(metadata.phone || "");
        }
      }
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        // Only set values if they exist in profileData
        if (profileData.first_name) setFirstName(profileData.first_name);
        if (profileData.last_name) setLastName(profileData.last_name);
        if (profileData.phone) setPhone(profileData.phone);
        if (profileData.avatar_url) setProfileImage(profileData.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setImageFile(file);
    
    // Create a preview URL for the selected image
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !userId) return null;
    
    setUploadLoading(true);
    
    try {
      // Create a unique file name for the image
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload the image to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageFile, { 
          upsert: true 
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL of the uploaded image
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Falha ao fazer upload da imagem",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) return;
    
    setLoading(true);
    
    try {
      // Upload image if a new one was selected
      let avatarUrl = profileImage;
      if (imageFile) {
        avatarUrl = await uploadImage();
      }
      
      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          avatar_url: avatarUrl,
        }
      });
      
      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
      }
      
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) throw profileError;
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
      });
      
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Editar Perfil
          </DialogTitle>
          <DialogDescription>
            Preencha suas informações pessoais abaixo
          </DialogDescription>
        </DialogHeader>
        
        {fetchLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-iparty" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-gray-200">
                  {profileImage ? (
                    <AvatarImage src={profileImage} alt="Foto de perfil" />
                  ) : (
                    <AvatarFallback className="bg-iparty text-white">
                      <User size={40} />
                    </AvatarFallback>
                  )}
                </Avatar>
                <Label
                  htmlFor="picture"
                  className="absolute bottom-0 right-0 bg-iparty text-white p-1 rounded-full cursor-pointer"
                >
                  <ImagePlus size={16} />
                </Label>
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Seu sobrenome"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || uploadLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || uploadLoading}
                className="bg-iparty hover:bg-iparty-dark"
              >
                {(loading || uploadLoading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
