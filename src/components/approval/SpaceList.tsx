
import React from "react";
import SpaceListItem from "./SpaceListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SpaceWithProfileInfo = {
  id: string;
  name: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
  photo_count?: number;
  price?: string;
};

type SpaceListProps = {
  spaces: SpaceWithProfileInfo[];
  loading: boolean;
  onViewDetails: (id: string) => void;
};

const SpaceList: React.FC<SpaceListProps> = ({ spaces, loading, onViewDetails }) => {
  // Filtrar espaços por status com múltiplas abordagens
  const pendingSpaces = spaces.filter((space) => {
    // Tentar diferentes formas de identificar espaços pendentes
    const strictPending = space.status === "pending";
    const stringPending = String(space.status) === "pending";
    const nullStatus = space.status === null || space.status === undefined || space.status === '';
    
    console.log(`Checking space "${space.name}":`, {
      status: space.status,
      statusType: typeof space.status,
      strictPending,
      stringPending,
      nullStatus
    });
    
    // Retornar true se qualquer uma das condições for verdadeira
    return strictPending || stringPending || nullStatus;
  });
  
  const approvedSpaces = spaces.filter((space) => {
    return space.status === "approved" || String(space.status) === "approved";
  });
  
  const rejectedSpaces = spaces.filter((space) => {
    return space.status === "rejected" || String(space.status) === "rejected";
  });

  console.log("🎯 SpaceList filtering results:", { 
    totalSpaces: spaces.length, 
    pendingCount: pendingSpaces.length, 
    approvedCount: approvedSpaces.length, 
    rejectedCount: rejectedSpaces.length,
    loading,
    pendingSpaceNames: pendingSpaces.map(s => s.name),
    allSpaceStatuses: spaces.map(s => ({ name: s.name, status: s.status, type: typeof s.status }))
  });

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
                  <SpaceListItem 
                    key={space.id} 
                    space={space} 
                    onViewDetails={onViewDetails} 
                  />
                ))}
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">Nenhum espaço pendente de aprovação encontrado.</p>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Debug Information:</h4>
                  <p className="text-sm text-yellow-700">
                    Total de espaços: {spaces.length}
                  </p>
                  <p className="text-sm text-yellow-700">
                    Espaços encontrados: {spaces.map(s => `"${s.name}" (status: ${s.status})`).join(", ")}
                  </p>
                </div>
              </div>
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
                  <SpaceListItem 
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
                  <SpaceListItem 
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

export default SpaceList;
