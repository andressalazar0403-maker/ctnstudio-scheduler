-- 1. Fix privilege escalation: is_admin() now keys off auth.uid() and requires confirmed email.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.admin_emails ae ON lower(ae.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

-- 2. Lock down the navaja-video-imagenes storage bucket.
-- Public reads remain (bucket.public = true), but only admins can write/delete.
DROP POLICY IF EXISTS "navaja_videos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "navaja_videos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "navaja_videos_admin_delete" ON storage.objects;

CREATE POLICY "navaja_videos_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'navaja-video-imagenes' AND public.is_admin());

CREATE POLICY "navaja_videos_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'navaja-video-imagenes' AND public.is_admin())
WITH CHECK (bucket_id = 'navaja-video-imagenes' AND public.is_admin());

CREATE POLICY "navaja_videos_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'navaja-video-imagenes' AND public.is_admin());