
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Settings, User, Heart, Calendar, HelpCircle, Plus, Home, Star } from "lucide-react";

const Profile = () => {
  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="h-24 w-24 bg-iparty rounded-full flex items-center justify-center mb-4">
          <User size={50} className="text-white" />
        </div>
        <h2 className="text-xl font-medium">Maria Silva</h2>
        <p className="text-muted-foreground">maria.silva@email.com</p>
        <Button variant="outline" className="mt-4 text-sm">
          <Settings size={16} className="mr-2" />
          Editar Perfil
        </Button>
      </div>

      {/* Novas opções */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="p-4 flex items-center">
            <Plus size={20} className="text-iparty mr-3" />
            <span>Cadastrar espaço</span>
          </div>
          <Separator />
          <div className="p-4 flex items-center">
            <Plus size={20} className="text-iparty mr-3" />
            <span>Cadastrar fornecedor</span>
          </div>
          <Separator />
          <div className="p-4 flex items-center">
            <Home size={20} className="text-iparty mr-3" />
            <span>Meus espaços</span>
          </div>
          <Separator />
          <div className="p-4 flex items-center">
            <Star size={20} className="text-iparty mr-3" />
            <span>Promover Espaço</span>
          </div>
        </CardContent>
      </Card>

      {/* Opções existentes */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="p-4 flex items-center">
            <Heart size={20} className="text-iparty mr-3" />
            <span>Favoritos</span>
          </div>
          <Separator />
          <div className="p-4 flex items-center">
            <Calendar size={20} className="text-iparty mr-3" />
            <span>Meus Eventos</span>
          </div>
          <Separator />
          <div className="p-4 flex items-center">
            <HelpCircle size={20} className="text-iparty mr-3" />
            <span>Ajuda e Suporte</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full flex items-center justify-center text-destructive">
        <LogOut size={16} className="mr-2" />
        Sair
      </Button>
    </div>
  );
};

export default Profile;
