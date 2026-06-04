
DROP POLICY IF EXISTS "Users can cancel their own scheduled appointments" ON public.appointments;

CREATE POLICY "Users can cancel their own scheduled appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'scheduled'::appointment_status
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'::appointment_status
  AND service_id   = (SELECT a.service_id   FROM public.appointments a WHERE a.id = appointments.id)
  AND start_at     = (SELECT a.start_at     FROM public.appointments a WHERE a.id = appointments.id)
  AND end_at       = (SELECT a.end_at       FROM public.appointments a WHERE a.id = appointments.id)
  AND user_id      = (SELECT a.user_id      FROM public.appointments a WHERE a.id = appointments.id)
  AND COALESCE(client_id::text,'')    = COALESCE((SELECT a.client_id::text    FROM public.appointments a WHERE a.id = appointments.id),'')
  AND COALESCE(client_name,'')        = COALESCE((SELECT a.client_name        FROM public.appointments a WHERE a.id = appointments.id),'')
  AND COALESCE(client_email,'')       = COALESCE((SELECT a.client_email       FROM public.appointments a WHERE a.id = appointments.id),'')
  AND COALESCE(client_phone,'')       = COALESCE((SELECT a.client_phone       FROM public.appointments a WHERE a.id = appointments.id),'')
);
