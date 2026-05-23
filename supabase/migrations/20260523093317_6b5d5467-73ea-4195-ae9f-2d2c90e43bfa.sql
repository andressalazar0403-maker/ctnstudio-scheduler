
-- Enum para estado de citas
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- Tabla profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile name"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tabla services (catálogo público)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are readable by everyone"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.services (slug, name, duration_minutes, sort_order) VALUES
  ('corte', 'Corte de pelo', 35, 1),
  ('barba', 'Arreglo de barba', 20, 2),
  ('combo', 'Corte + Barba', 55, 3);

-- Tabla business_hours
CREATE TABLE public.business_hours (
  day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business hours readable by everyone"
  ON public.business_hours FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed: L-S 10-20h, domingo cerrado (0=domingo)
INSERT INTO public.business_hours (day_of_week, open_time, close_time, closed) VALUES
  (0, '00:00', '00:00', true),
  (1, '10:00', '20:00', false),
  (2, '10:00', '20:00', false),
  (3, '10:00', '20:00', false),
  (4, '10:00', '20:00', false),
  (5, '10:00', '20:00', false),
  (6, '10:00', '20:00', false);

-- Tabla appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX appointments_start_at_idx ON public.appointments (start_at);
CREATE INDEX appointments_user_id_idx ON public.appointments (user_id);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts y updates van por server fn con admin client (validaciones)
-- Pero permitimos al usuario cancelar las suyas
CREATE POLICY "Users can cancel their own scheduled appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'scheduled')
  WITH CHECK (auth.uid() = user_id);

-- Trigger para crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
