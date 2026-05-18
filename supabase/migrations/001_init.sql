-- LovePulse v2.5.0 — Initial Supabase schema

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id       UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name     TEXT,
  role     TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User data (stores full app state as jsonb)
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users: read own profile"   ON public.profiles  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users: update own profile" ON public.profiles  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users: read own data"   ON public.user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users: insert own data" ON public.user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users: update own data" ON public.user_data FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile + user_data rows on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), 'user')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_data (user_id, data)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
