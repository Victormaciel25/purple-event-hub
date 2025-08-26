import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Info } from 'lucide-react';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { BookingFlow } from './BookingFlow';
import { useResources } from '@/hooks/useResources';
import { type Booking } from '@/hooks/useBooking';

interface BookingTabProps {
  spaceId: string;
  spaceName: string;
}

export const BookingTab: React.FC<BookingTabProps> = ({
  spaceId,
  spaceName,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingFlow, setBookingFlow] = useState<{
    resourceId: string;
    resourceName: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const { resources, loading } = useResources();

  // Filtrar recursos ativos deste espaço (assumindo que o spaceId está relacionado ao owner_id)
  const spaceResources = resources.filter(r => r.is_active);

  const handleTimeSlotSelect = (resourceId: string, resourceName: string, startTime: string, endTime: string) => {
    setBookingFlow({
      resourceId,
      resourceName,
      startTime,
      endTime,
    });
  };

  const handleBookingComplete = (booking: Booking) => {
    setCompletedBooking(booking);
    setBookingFlow(null);
  };

  const handleBookingCancel = () => {
    setBookingFlow(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não há fluxo de reserva ativo, mostrar calendário
  if (!bookingFlow) {
    return (
      <div className="space-y-6">
        {completedBooking && (
          <Alert className="bg-green-50 border-green-200">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-green-800">
              Reserva confirmada! Você receberá uma confirmação por email.
            </AlertDescription>
          </Alert>
        )}

        {spaceResources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Agenda não disponível</h3>
              <p className="text-muted-foreground text-center">
                Este espaço ainda não tem agenda configurada para reservas online.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Reserve seu horário</h3>
              <p className="text-muted-foreground">
                Selecione uma data e horário disponível para fazer sua reserva
              </p>
            </div>

            {spaceResources.map((resource) => (
              <div key={resource.id} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Clock className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-medium">{resource.name}</h4>
                </div>
                
                <AvailabilityCalendar
                  resourceId={resource.id}
                  onTimeSlotSelect={(startTime, endTime) => 
                    handleTimeSlotSelect(resource.id, resource.name, startTime, endTime)
                  }
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mostrar fluxo de reserva
  return (
    <div className="space-y-6">
      <BookingFlow
        resourceId={bookingFlow.resourceId}
        resourceName={bookingFlow.resourceName}
        startTime={bookingFlow.startTime}
        endTime={bookingFlow.endTime}
        onCancel={handleBookingCancel}
        onComplete={handleBookingComplete}
      />
    </div>
  );
};