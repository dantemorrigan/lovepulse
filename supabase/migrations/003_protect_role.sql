-- Prevent users from escalating their own role via the API.
-- Users can update their own profile (name, etc.) but NOT the role column.
-- Role changes are admin-only via the Supabase dashboard or service-role key.

DROP POLICY IF EXISTS "Users: update own profile" ON public.profiles;

CREATE POLICY "Users: update own profile (no role change)" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
