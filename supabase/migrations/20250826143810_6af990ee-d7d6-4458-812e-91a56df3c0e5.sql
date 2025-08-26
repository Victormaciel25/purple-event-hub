-- Sistema de Agendamento - Modelo de Dados Completo

-- Tabela principal de recursos agendáveis (espaços ou serviços de fornecedores)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('space','service')),
  name TEXT NOT NULL,
  tz TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  slot_granularity_minutes INT NOT NULL DEFAULT 30,
  min_notice_hours INT NOT NULL DEFAULT 24,
  booking_window_days INT NOT NULL DEFAULT 180,
  daily_capacity INT NOT NULL DEFAULT 1,
  concurrent_capacity INT NOT NULL DEFAULT 1,
  duration_minutes INT NOT NULL DEFAULT 240,
  buffer_before_minutes INT NOT NULL DEFAULT 60,
  buffer_after_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Horário semanal padrão (0 = domingo ... 6 = sábado)
CREATE TABLE public.resource_working_hours (
  id BIGSERIAL PRIMARY KEY,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exceções (fechado/aberto extra) para datas específicas ou intervalos
CREATE TABLE public.resource_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('closed','open')),
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Holds temporários para evitar overbooking durante checkout
CREATE TABLE public.holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  start_t TIMESTAMPTZ NOT NULL,
  end_t TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservas confirmadas
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  start_t TIMESTAMPTZ NOT NULL,
  end_t TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','canceled')) DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'iparty',
  external_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  total_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas de calendário externo (OAuth) por proprietário
CREATE TABLE public.external_calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google','microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Eventos espelhados (pull) dos provedores externos
CREATE TABLE public.external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  start_t TIMESTAMPTZ NOT NULL,
  end_t TIMESTAMPTZ NOT NULL,
  title TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, provider, external_id)
);

-- Índices para performance
CREATE INDEX idx_bookings_resource_time_status ON public.bookings (resource_id, start_t, end_t, status);
CREATE INDEX idx_holds_resource_time_status ON public.holds (resource_id, start_t, end_t, status, expires_at);
CREATE INDEX idx_external_events_resource_time ON public.external_events (resource_id, start_t, end_t);
CREATE INDEX idx_resource_exceptions_resource_dates ON public.resource_exceptions (resource_id, date_from, date_to);
CREATE INDEX idx_resource_working_hours_resource_weekday ON public.resource_working_hours (resource_id, weekday);
CREATE INDEX idx_resources_owner_type_active ON public.resources (owner_id, type, is_active);
CREATE INDEX idx_holds_expires_at ON public.holds (expires_at) WHERE status = 'active';

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para resources
CREATE POLICY "owners_can_manage_resources" ON public.resources
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "public_can_view_active_resources" ON public.resources
  FOR SELECT
  USING (is_active = true);

-- Políticas RLS para resource_working_hours
CREATE POLICY "owners_manage_working_hours" ON public.resource_working_hours
  FOR ALL
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id))
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

-- Políticas RLS para resource_exceptions
CREATE POLICY "owners_manage_exceptions" ON public.resource_exceptions
  FOR ALL
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id))
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

-- Políticas RLS para bookings
CREATE POLICY "owners_read_resource_bookings" ON public.bookings
  FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

CREATE POLICY "users_read_own_bookings" ON public.bookings
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "users_create_bookings" ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owners_update_resource_bookings" ON public.bookings
  FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

CREATE POLICY "users_update_own_bookings" ON public.bookings
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Políticas RLS para holds
CREATE POLICY "users_read_own_holds" ON public.holds
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "users_create_holds" ON public.holds
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "owners_read_resource_holds" ON public.holds
  FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

-- Políticas RLS para external_calendar_accounts
CREATE POLICY "owners_manage_calendar_accounts" ON public.external_calendar_accounts
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Políticas RLS para external_events
CREATE POLICY "owners_manage_external_events" ON public.external_events
  FOR ALL
  USING (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id))
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.resources r WHERE r.id = resource_id));

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpar holds expirados (será chamada por edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.holds 
  SET status = 'expired' 
  WHERE status = 'active' 
    AND expires_at < now();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;