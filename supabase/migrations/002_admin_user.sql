-- Run this AFTER creating the admin user in Supabase Auth dashboard.
-- Admin email: admin@lovepulse.dev
-- Admin password: LvPls#9271!Admin

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@lovepulse.dev'
);
