import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Settings, 
  Calendar, 
  Clock, 
  Users, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useResources, type Resource } from '@/hooks/useResources';
import { ResourceSettings } from '@/components/booking/ResourceSettings';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'list' | 'create' | 'edit' | 'calendar';

const MyResources: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { resources, loading, createResource, updateResource, deleteResource } = useResources();

  const handleCreateResource = async (data: any) => {
    try {
      await createResource(data);
      setViewMode('list');
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  const handleUpdateResource = async (data: any) => {
    if (!selectedResource) return;
    
    try {
      await updateResource(selectedResource.id, data);
      setViewMode('list');
      setSelectedResource(null);
    } catch (error) {
      console.error('Error updating resource:', error);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    try {
      await deleteResource(resourceToDelete.id);
      setResourceToDelete(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource);
    setViewMode('edit');
  };

  const handleViewCalendar = (resource: Resource) => {
    setSelectedResource(resource);
    setViewMode('calendar');
  };

  const handleTimeSlotSelect = (startTime: string, endTime: string) => {
    // Aqui você pode implementar ações quando um horário é selecionado
    // Por exemplo, abrir um modal para ver detalhes da reserva
    console.log('Time slot selected:', { startTime, endTime });
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {viewMode === 'list' && 'Meus Recursos'}
            {viewMode === 'create' && 'Novo Recurso'}
            {viewMode === 'edit' && 'Editar Recurso'}
            {viewMode === 'calendar' && `Agenda - ${selectedResource?.name}`}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'list' && 'Gerencie seus recursos agendáveis'}
            {viewMode === 'create' && 'Configure um novo recurso para reservas'}
            {viewMode === 'edit' && 'Edite as configurações do recurso'}
            {viewMode === 'calendar' && 'Visualize a disponibilidade e reservas'}
          </p>
        </div>

        {viewMode === 'list' && (
          <Button onClick={() => setViewMode('create')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Recurso
          </Button>
        )}

        {viewMode !== 'list' && (
          <Button variant="outline" onClick={() => setViewMode('list')}>
            Voltar
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <>
          {resources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum recurso criado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie seu primeiro recurso agendável para começar a receber reservas
                </p>
                <Button onClick={() => setViewMode('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Recurso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => (
                <Card key={resource.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{resource.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{resource.type}</Badge>
                          {resource.is_active ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCalendar(resource)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Agenda
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(resource)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setResourceToDelete(resource)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Duração: {resource.duration_minutes}min
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Capacidade: {resource.daily_capacity}/dia
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Criado em {format(new Date(resource.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewCalendar(resource)}
                        className="flex-1"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Agenda
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEdit(resource)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'create' && (
        <ResourceSettings
          onSave={handleCreateResource}
          onCancel={() => setViewMode('list')}
          loading={loading}
        />
      )}

      {viewMode === 'edit' && selectedResource && (
        <ResourceSettings
          resource={selectedResource}
          onSave={handleUpdateResource}
          onCancel={() => setViewMode('list')}
          loading={loading}
        />
      )}

      {viewMode === 'calendar' && selectedResource && (
        <AvailabilityCalendar
          resourceId={selectedResource.id}
          onTimeSlotSelect={handleTimeSlotSelect}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!resourceToDelete} onOpenChange={() => setResourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Excluir Recurso
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o recurso "{resourceToDelete?.name}"? 
              Esta ação não pode ser desfeita e todas as reservas associadas serão canceladas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResource}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyResources;