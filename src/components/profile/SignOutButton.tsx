
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  onSignOut: () => void;
  loading: boolean;
}

const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut, loading }) => {
  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center justify-center text-destructive"
      onClick={onSignOut}
      disabled={loading}
    >
      <LogOut size={16} className="mr-2" />
      {loading ? "Processando..." : "Sair"}
    </Button>
  );
};

export default SignOutButton;
