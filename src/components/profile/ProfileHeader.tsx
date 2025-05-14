
import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, User, Upload, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileHeaderProps {
  firstName: string;
  lastName: string;
  email: string | undefined;
  avatarUrl: string | null;
  onEditProfile: () => void;
  onUpdatePhoto: () => void;
  onDeletePhoto: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  firstName,
  lastName,
  email,
  avatarUrl,
  onEditProfile,
  onUpdatePhoto,
  onDeletePhoto,
}) => {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative">
        <Avatar className="h-24 w-24 mb-4">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Foto de perfil" />
          ) : (
            <AvatarFallback className="bg-iparty">
              <User size={50} className="text-white" />
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex gap-2 mt-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-8 h-8 p-0 bg-white"
            onClick={onUpdatePhoto}
            title="Alterar foto"
          >
            <Upload size={14} />
          </Button>
          
          {avatarUrl && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full w-8 h-8 p-0 bg-white text-red-500"
              onClick={onDeletePhoto}
              title="Excluir foto"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
      
      {fullName && (
        <h2 className="text-xl font-bold mb-1 mt-2">
          {fullName}
        </h2>
      )}
      <p className="text-muted-foreground">{email}</p>
      <Button 
        variant="outline" 
        className="mt-4 text-sm"
        onClick={onEditProfile}
      >
        <Settings size={16} className="mr-2" />
        Editar Perfil
      </Button>
    </div>
  );
};

export default ProfileHeader;
