
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, User, Calendar, DollarSign, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Subscription {
  id: string;
  user_id: string;
  space_id: string;
  plan_id: string;
  payment_id: string | null;
  payment_status: string;
  amount: number;
  created_at: string;
  expires_at: string | null;
  active: boolean;
  user_profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  space: {
    name: string;
  } | null;
}

const SubscriptionsManagement = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isSuperAdmin, loading: roleLoading } = useUserRoles();

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/profile");
    }
  }, [isSuperAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSubscriptions();
    }
  }, [isSuperAdmin]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from("space_promotions")
        .select("*")
        .eq("plan_id", "monthly_recurring")
        .order("created_at", { ascending: false });

      if (promotionsError) throw promotionsError;

      if (!promotionsData || promotionsData.length === 0) {
        setSubscriptions([]);
        return;
      }

      // Get unique user IDs and space IDs
      const userIds = [...new Set(promotionsData.map(p => p.user_id))];
      const spaceIds = [...new Set(promotionsData.map(p => p.space_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch spaces for these space IDs
      const { data: spacesData, error: spacesError } = await supabase
        .from("spaces")
        .select("id, name")
        .in("id", spaceIds);

      if (spacesError) throw spacesError;

      // Create lookup maps
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const spacesMap = new Map(spacesData?.map(s => [s.id, s]) || []);

      // Combine the data
      const subscriptionsWithDetails = promotionsData.map(promotion => ({
        ...promotion,
        user_profile: profilesMap.get(promotion.user_id) || null,
        space: spacesMap.get(promotion.space_id) || null
      }));

      setSubscriptions(subscriptionsWithDetails);
    } catch (err: any) {
      console.error("Error fetching subscriptions:", err);
      setError(err.message || "Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, active: boolean) => {
    if (!active) {
      return <Badge variant="destructive">Inativa</Badge>;
    }
    
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Aprovada</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container px-4 py-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="text-iparty" />
          Gerenciamento de Assinaturas
        </h1>
        <Button 
          onClick={fetchSubscriptions} 
          disabled={loading}
          variant="outline"
          className="ml-auto flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="text-green-600" />
            Assinaturas Mensais Recorrentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Espaço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>ID do Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-muted-foreground" />
                          <span>
                            {subscription.user_profile 
                              ? `${subscription.user_profile.first_name || ''} ${subscription.user_profile.last_name || ''}`.trim() || 'Nome não disponível'
                              : 'Nome não disponível'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.space?.name || 'Espaço não encontrado'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(subscription.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.payment_status, subscription.active)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-muted-foreground" />
                          {formatDate(subscription.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.expires_at ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-muted-foreground" />
                            {formatDate(subscription.expires_at)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {subscription.payment_id || 'N/A'}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        <p>Total de assinaturas: {subscriptions.length}</p>
        <p>Assinaturas ativas: {subscriptions.filter(s => s.active).length}</p>
        <p>Assinaturas inativas: {subscriptions.filter(s => !s.active).length}</p>
      </div>
    </div>
  );
};

export default SubscriptionsManagement;
