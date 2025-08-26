import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAvailability } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

interface AvailabilityCalendarProps {
  resourceId: string;
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  resourceId,
  onTimeSlotSelect,
  selectedDate,
  onDateSelect,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const fromDate = format(startOfDay(currentMonth), 'yyyy-MM-dd');
  const toDate = format(addDays(startOfDay(currentMonth), 30), 'yyyy-MM-dd');
  
  const { availability, loading } = useAvailability(resourceId, fromDate, toDate);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
    }
  };

  const getTimeSlotsForDate = (date: Date) => {
    if (!availability) return [];
    
    return availability.slots.filter(slot => {
      const slotDate = new Date(slot.start_t);
      return isSameDay(slotDate, date);
    });
  };

  const selectedTimeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Selecionar Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            disabled={(date) => date < new Date()}
            locale={ptBR}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedDate 
                ? `Horários - ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}`
                : 'Selecione uma data'
              }
            </CardTitle>
            {loading && (
              <Badge variant="secondary">Carregando...</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-muted-foreground text-center py-8">
              Selecione uma data no calendário para ver os horários disponíveis
            </p>
          ) : selectedTimeSlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Não há horários disponíveis para esta data
            </p>
          ) : (
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {selectedTimeSlots.map((slot, index) => {
                const startTime = new Date(slot.start_t);
                const endTime = new Date(slot.end_t);
                
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between h-auto p-3"
                    onClick={() => onTimeSlotSelect(slot.start_t, slot.end_t)}
                  >
                    <span>
                      {format(startTime, 'HH:mm', { locale: ptBR })} - {format(endTime, 'HH:mm', { locale: ptBR })}
                    </span>
                    <Badge variant="secondary">
                      {availability?.resource.duration_minutes}min
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};