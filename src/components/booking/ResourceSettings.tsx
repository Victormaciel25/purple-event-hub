import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, Users, Calendar, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Resource } from '@/hooks/useResources';

const resourceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  slot_granularity_minutes: z.number().min(15, 'Mínimo 15 minutos').max(240, 'Máximo 4 horas'),
  duration_minutes: z.number().min(30, 'Mínimo 30 minutos').max(480, 'Máximo 8 horas'),
  min_notice_hours: z.number().min(1, 'Mínimo 1 hora').max(168, 'Máximo 1 semana'),
  booking_window_days: z.number().min(1, 'Mínimo 1 dia').max(365, 'Máximo 1 ano'),
  daily_capacity: z.number().min(1, 'Mínimo 1').max(100, 'Máximo 100'),
  concurrent_capacity: z.number().min(1, 'Mínimo 1').max(50, 'Máximo 50'),
  buffer_before_minutes: z.number().min(0, 'Mínimo 0 minutos').max(120, 'Máximo 2 horas'),
  buffer_after_minutes: z.number().min(0, 'Mínimo 0 minutos').max(120, 'Máximo 2 horas'),
  is_active: z.boolean(),
  tz: z.string(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface ResourceSettingsProps {
  resource?: Resource;
  onSave: (data: ResourceFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ResourceSettings: React.FC<ResourceSettingsProps> = ({
  resource,
  onSave,
  onCancel,
  loading = false,
}) => {
  const isEditing = !!resource;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: resource || {
      name: '',
      type: 'space',
      slot_granularity_minutes: 30,
      duration_minutes: 240,
      min_notice_hours: 24,
      booking_window_days: 180,
      daily_capacity: 1,
      concurrent_capacity: 1,
      buffer_before_minutes: 60,
      buffer_after_minutes: 60,
      is_active: true,
      tz: 'America/Sao_Paulo',
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: ResourceFormData) => {
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {isEditing ? 'Editar Recurso' : 'Novo Recurso'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Recurso *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ex: Salão Principal"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="space">Espaço para Eventos</SelectItem>
                        <SelectItem value="service">Serviço</SelectItem>
                        <SelectItem value="equipment">Equipamento</SelectItem>
                        <SelectItem value="room">Sala</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configurações de Horário */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Configurações de Horário
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duração (minutos) *</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  {...register('duration_minutes', { valueAsNumber: true })}
                  placeholder="240"
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-destructive">{errors.duration_minutes.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot_granularity_minutes">Intervalos de reserva (minutos) *</Label>
                <Controller
                  name="slot_granularity_minutes"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer_before_minutes">Intervalo antes (minutos)</Label>
                <Input
                  id="buffer_before_minutes"
                  type="number"
                  {...register('buffer_before_minutes', { valueAsNumber: true })}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer_after_minutes">Intervalo depois (minutos)</Label>
                <Input
                  id="buffer_after_minutes"
                  type="number"
                  {...register('buffer_after_minutes', { valueAsNumber: true })}
                  placeholder="60"
                />
              </div>
            </div>
          </div>

          {/* Configurações de Reserva */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Regras de Reserva
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_notice_hours">Antecedência mínima (horas) *</Label>
                <Input
                  id="min_notice_hours"
                  type="number"
                  {...register('min_notice_hours', { valueAsNumber: true })}
                  placeholder="24"
                />
                {errors.min_notice_hours && (
                  <p className="text-sm text-destructive">{errors.min_notice_hours.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_window_days">Janela de reserva (dias) *</Label>
                <Input
                  id="booking_window_days"
                  type="number"
                  {...register('booking_window_days', { valueAsNumber: true })}
                  placeholder="180"
                />
                {errors.booking_window_days && (
                  <p className="text-sm text-destructive">{errors.booking_window_days.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configurações de Capacidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5" />
              Capacidade
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily_capacity">Capacidade diária *</Label>
                <Input
                  id="daily_capacity"
                  type="number"
                  {...register('daily_capacity', { valueAsNumber: true })}
                  placeholder="1"
                />
                {errors.daily_capacity && (
                  <p className="text-sm text-destructive">{errors.daily_capacity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="concurrent_capacity">Capacidade simultânea *</Label>
                <Input
                  id="concurrent_capacity"
                  type="number"
                  {...register('concurrent_capacity', { valueAsNumber: true })}
                  placeholder="1"
                />
                {errors.concurrent_capacity && (
                  <p className="text-sm text-destructive">{errors.concurrent_capacity.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status</h3>
            
            <div className="flex items-center space-x-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>Recurso ativo</Label>
              {watchedValues.is_active ? (
                <Badge variant="default">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Resumo da Configuração
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Duração: {watchedValues.duration_minutes} minutos</p>
              <p>• Intervalos de {watchedValues.slot_granularity_minutes} minutos</p>
              <p>• Reserva com {watchedValues.min_notice_hours}h de antecedência</p>
              <p>• Até {watchedValues.booking_window_days} dias no futuro</p>
              <p>• {watchedValues.daily_capacity} reserva(s) por dia</p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Recurso')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};