
-- Admin emails + helper
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_emails (email) VALUES ('eliot0583@gmail.com')
  ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
  );
$$;

DROP POLICY IF EXISTS "Admins can read admin emails" ON public.admin_emails;
CREATE POLICY "Admins can read admin emails" ON public.admin_emails
  FOR SELECT TO authenticated USING (public.is_admin());

-- Services price + admin policies
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Admins manage services - insert" ON public.services;
DROP POLICY IF EXISTS "Admins manage services - update" ON public.services;
DROP POLICY IF EXISTS "Admins manage services - delete" ON public.services;
CREATE POLICY "Admins manage services - insert" ON public.services
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage services - update" ON public.services
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage services - delete" ON public.services
  FOR DELETE TO authenticated USING (public.is_admin());

DELETE FROM public.appointments;
DELETE FROM public.services;
INSERT INTO public.services (slug, name, duration_minutes, price_cents, sort_order) VALUES
  ('corte',              'Corte',                       35, 1500, 1),
  ('corte-barba',        'Corte + Barba',               55, 2500, 2),
  ('corte-barba-cejas',  'Corte + Barba + Cejas',       65, 3000, 3),
  ('corte-cejas',        'Corte + Cejas',               45, 2000, 4),
  ('cejas',              'Cejas',                       10,  500, 5);

-- Appointments walk-in + admin
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_user_or_walkin') THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_user_or_walkin
      CHECK (user_id IS NOT NULL OR (client_name IS NOT NULL AND client_phone IS NOT NULL));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins read all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins delete appointments" ON public.appointments;
CREATE POLICY "Admins read all appointments" ON public.appointments
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (public.is_admin());

-- Business hours: closed by default, admin can update
UPDATE public.business_hours SET closed = true;
INSERT INTO public.business_hours (day_of_week, open_time, close_time, closed)
SELECT g, '10:00'::time, '20:00'::time, true
FROM generate_series(0,6) g
WHERE NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = g);

DROP POLICY IF EXISTS "Admins update business hours" ON public.business_hours;
CREATE POLICY "Admins update business hours" ON public.business_hours
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles: admin read/update all
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
