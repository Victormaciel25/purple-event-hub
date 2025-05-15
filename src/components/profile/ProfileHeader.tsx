
import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileHeaderProps {
  firstName: string;
  lastName: string;
  email: string | undefined;
  avatarUrl: string | null;
  onEditProfile: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  firstName,
  lastName,
  email,
  avatarUrl,
  onEditProfile,
}) => {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="flex flex-col items-center mb-8">
      <Avatar className="h-24 w-24 mb-4">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="Foto de perfil" />
        ) : (
          <AvatarFallback className="bg-iparty">
            <User size={50} className="text-white" />
          </AvatarFallback>
        )}
      </Avatar>
      {fullName && (
        <h2 className="text-xl font-bold mb-1">
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
