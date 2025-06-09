
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
  subscription_id: string;
  status: string;
  amount: number;
  payer_email: string;
  created_at: string;
  started_at: string | null;
  next_billing_date: string | null;
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
      
      // Buscar assinaturas na tabela space_subscriptions com plan_id correto
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("space_subscriptions")
        .select("*")
        .eq("plan_id", "monthly-recurring")
        .order("created_at", { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      if (!subscriptionsData || subscriptionsData.length === 0) {
        setSubscriptions([]);
        return;
      }

      // Get unique user IDs and space IDs
      const userIds = [...new Set(subscriptionsData.map(s => s.user_id))];
      const spaceIds = [...new Set(subscriptionsData.map(s => s.space_id))];

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
      const subscriptionsWithDetails = subscriptionsData.map(subscription => ({
        ...subscription,
        user_profile: profilesMap.get(subscription.user_id) || null,
        space: spacesMap.get(subscription.space_id) || null
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return <Badge variant="default" className="bg-green-500">Autorizada</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausada</Badge>;
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
                    <TableHead>Email do Pagador</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Iniciada em</TableHead>
                    <TableHead>Próxima Cobrança</TableHead>
                    <TableHead>ID da Assinatura</TableHead>
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
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {subscription.payer_email}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(subscription.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-muted-foreground" />
                          {formatDate(subscription.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.started_at ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-muted-foreground" />
                            {formatDate(subscription.started_at)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription.next_billing_date ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-muted-foreground" />
                            {formatDate(subscription.next_billing_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {subscription.subscription_id}
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
        <p>Assinaturas autorizadas: {subscriptions.filter(s => s.status === 'authorized').length}</p>
        <p>Outras assinaturas: {subscriptions.filter(s => s.status !== 'authorized').length}</p>
      </div>
    </div>
  );
};

export default SubscriptionsManagement;
