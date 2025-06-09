
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SpaceCard from "./SpaceCard";
import type { SpaceWithProfile } from "@/types/approval";

interface SpacesListProps {
  spaces: SpaceWithProfile[];
  loading: boolean;
  onViewDetails: (id: string) => void;
}

const SpacesList: React.FC<SpacesListProps> = ({ spaces, loading, onViewDetails }) => {
  // Filtrar espaços por status
  const pendingSpaces = spaces.filter((space) => 
    space.status === "pending" || 
    space.status === null || 
    space.status === undefined
  );
  
  const approvedSpaces = spaces.filter((space) => space.status === "approved");
  const rejectedSpaces = spaces.filter((space) => space.status === "rejected");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando espaços...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (spaces.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum espaço encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não há espaços cadastrados no sistema no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="pending" className="mb-6">
      <TabsList className="mb-4">
        <TabsTrigger value="pending" className="relative">
          Pendentes
          {pendingSpaces.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingSpaces.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="approved">Aprovados ({approvedSpaces.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rejeitados ({rejectedSpaces.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Espaços Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingSpaces.map((space) => (
                  <SpaceCard 
                    key={space.id} 
                    space={space} 
                    onViewDetails={onViewDetails} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum espaço pendente de aprovação encontrado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="approved">
        <Card>
          <CardHeader>
            <CardTitle>Espaços Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedSpaces.map((space) => (
                  <SpaceCard 
                    key={space.id} 
                    space={space} 
                    onViewDetails={onViewDetails} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum espaço aprovado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rejected">
        <Card>
          <CardHeader>
            <CardTitle>Espaços Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            {rejectedSpaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rejectedSpaces.map((space) => (
                  <SpaceCard 
                    key={space.id} 
                    space={space} 
                    onViewDetails={onViewDetails} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum espaço rejeitado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default SpacesList;
