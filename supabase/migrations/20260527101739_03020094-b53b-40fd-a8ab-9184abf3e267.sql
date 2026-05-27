-- 1. Color por servicio
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#a855f7';

-- 2. Campos extra en appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_id UUID;

-- 3. Tabla de clientes (ficha persistente del admin)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read clients" ON public.clients FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update clients" ON public.clients FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated USING (is_admin());

-- Índices para búsqueda predictiva
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (lower(name));
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (lower(email));
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
