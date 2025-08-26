import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBooking, type Hold, type Booking } from '@/hooks/useBooking';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookingSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFlowProps {
  resourceId: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  onCancel: () => void;
  onComplete: (booking: Booking) => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  resourceId,
  resourceName,
  startTime,
  endTime,
  onCancel,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<'hold' | 'form' | 'success'>('hold');
  const [hold, setHold] = useState<Hold | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { loading, createHold, confirmBooking } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  // Criar hold automaticamente quando componente monta
  useEffect(() => {
    const initializeHold = async () => {
      const holdData = await createHold(resourceId, startTime, endTime);
      if (holdData) {
        setHold(holdData);
        setCurrentStep('form');
        
        // Calcular tempo restante
        const expiresAt = new Date(holdData.expires_at).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(timeRemaining);
      }
    };

    initializeHold();
  }, [resourceId, startTime, endTime]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onCancel(); // Auto-cancel when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onCancel]);

  const onSubmit = async (data: BookingFormData) => {
    if (!hold) return;

    const customerData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
    };

    const booking = await confirmBooking(hold.id, customerData);
    if (booking) {
      setCurrentStep('success');
      onComplete(booking);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  if (currentStep === 'hold') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Reservando Horário...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Reserva Confirmada!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-lg mb-4">Sua reserva foi confirmada com sucesso!</p>
            <div className="space-y-2 text-muted-foreground">
              <p>{resourceName}</p>
              <p>{format(startDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
              <p>{format(startDate, 'HH:mm', { locale: ptBR })} - {format(endDate, 'HH:mm', { locale: ptBR })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Confirmar Reserva
          </CardTitle>
          {timeLeft > 0 && (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription>
                Tempo restante para confirmar: <strong>{formatTime(timeLeft)}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Resumo da reserva */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{resourceName}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(startDate, 'HH:mm', { locale: ptBR })} - {format(endDate, 'HH:mm', { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Formulário de dados */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome completo *
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Seu nome completo"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Informações adicionais sobre sua reserva..."
                  rows={3}
                />
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
                disabled={loading || timeLeft <= 0}
                className="flex-1"
              >
                {loading ? 'Confirmando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};