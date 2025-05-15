
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Loader2, ImagePlus, User, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  onProfileUpdated: () => void;
  onDeletePhoto: () => void;
}

const EditProfileDialog = ({
  open,
  onOpenChange,
  userId,
  onProfileUpdated,
  onDeletePhoto,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast: toastUI } = useToast();

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
        if (metadata && metadata.avatar_url) {
          setProfileImage(metadata.avatar_url);
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
      const filePath = `${userId}/${fileName}`;
      
      console.log("Uploading image to path:", filePath);
      
      // Upload the image to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageFile, { 
          upsert: true 
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      console.log("Upload successful:", data);
      
      // Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log("Public URL:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Falha ao fazer upload da imagem");
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
        console.log("Uploading new image file");
        avatarUrl = await uploadImage();
      }
      
      if (avatarUrl) {
        console.log("Avatar URL to save:", avatarUrl);
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
        throw metadataError;
      }
      
      console.log("User metadata updated successfully");
      
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
      
      if (profileError) {
        console.error("Error updating profile in database:", profileError);
        throw profileError;
      }
      
      console.log("Profile updated successfully in database");
      
      toast.success("Perfil atualizado com sucesso");
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhotoClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    onDeletePhoto();
  };

  return (
    <>
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
                  <div className="flex gap-2 mt-2 justify-center">
                    <Label
                      htmlFor="picture"
                      className="bg-iparty text-white p-1.5 rounded-full cursor-pointer flex items-center justify-center w-8 h-8"
                    >
                      <ImagePlus size={16} />
                    </Label>
                    
                    {profileImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full w-8 h-8 p-0 bg-white text-red-500"
                        onClick={handleDeletePhotoClick}
                        title="Excluir foto"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto de perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir sua foto de perfil? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditProfileDialog;
