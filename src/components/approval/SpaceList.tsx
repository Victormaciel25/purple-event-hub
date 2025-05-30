
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
  // Filtrar espaços por status
  const pendingSpaces = spaces.filter((space) => space.status === "pending");
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
        <TabsTrigger value="approved">Aprovados</TabsTrigger>
        <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
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
              <p className="text-muted-foreground">Nenhum espaço pendente de aprovação.</p>
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
