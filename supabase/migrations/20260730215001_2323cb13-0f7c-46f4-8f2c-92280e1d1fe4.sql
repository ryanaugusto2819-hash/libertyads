-- 0. Resolve owner (current admin)
DO $$
DECLARE owner_id uuid;
BEGIN
  SELECT p.id INTO owner_id FROM public.profiles p WHERE p.email = 'ryanppv123@outlook.com' LIMIT 1;
  IF owner_id IS NULL THEN
    SELECT ur.user_id INTO owner_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  END IF;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found to own existing data';
  END IF;
  PERFORM set_config('app.owner_id', owner_id::text, false);
END $$;

-- 1. webhook key on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webhook_key text;
UPDATE public.profiles SET webhook_key = encode(gen_random_bytes(16), 'hex') WHERE webhook_key IS NULL;
ALTER TABLE public.profiles ALTER COLUMN webhook_key SET DEFAULT encode(gen_random_bytes(16), 'hex');
ALTER TABLE public.profiles ALTER COLUMN webhook_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_webhook_key_idx ON public.profiles(webhook_key);

-- 2. add user_id to per-user tables
ALTER TABLE public.niches            ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.countries         ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bm_accounts       ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.webhook_sales     ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.ad_videos         ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.campaign_configs  ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.zapi_config       ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.niches           SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.countries        SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.bm_accounts      SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.webhook_sales    SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.ad_videos        SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.campaign_configs SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;
UPDATE public.zapi_config      SET user_id = current_setting('app.owner_id')::uuid WHERE user_id IS NULL;

ALTER TABLE public.niches           ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.countries        ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.bm_accounts      ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.webhook_sales    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ad_videos        ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.campaign_configs ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.zapi_config      ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS niches_user_idx ON public.niches(user_id);
CREATE INDEX IF NOT EXISTS countries_user_idx ON public.countries(user_id);
CREATE INDEX IF NOT EXISTS bm_accounts_user_idx ON public.bm_accounts(user_id);
CREATE INDEX IF NOT EXISTS webhook_sales_user_idx ON public.webhook_sales(user_id);
CREATE INDEX IF NOT EXISTS ad_videos_user_idx ON public.ad_videos(user_id);
CREATE INDEX IF NOT EXISTS campaign_configs_user_idx ON public.campaign_configs(user_id);
CREATE INDEX IF NOT EXISTS zapi_config_user_idx ON public.zapi_config(user_id);

-- 3. replace policies with owner-scoped ones
DROP POLICY IF EXISTS "Admins manage niches" ON public.niches;
DROP POLICY IF EXISTS "Authenticated read niches" ON public.niches;
CREATE POLICY "Users manage own niches" ON public.niches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated read countries" ON public.countries;
CREATE POLICY "Users manage own countries" ON public.countries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins write bm_accounts" ON public.bm_accounts;
DROP POLICY IF EXISTS "Authenticated read bm_accounts" ON public.bm_accounts;
CREATE POLICY "Users manage own bm_accounts" ON public.bm_accounts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage bm_account_secrets" ON public.bm_account_secrets;
CREATE POLICY "Users manage own bm_account_secrets" ON public.bm_account_secrets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bm_accounts b WHERE b.id = bm_account_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bm_accounts b WHERE b.id = bm_account_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can read webhook_sales" ON public.webhook_sales;
CREATE POLICY "Users read own webhook_sales" ON public.webhook_sales FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own webhook_sales" ON public.webhook_sales FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can delete ad_videos" ON public.ad_videos;
DROP POLICY IF EXISTS "Admins can insert ad_videos" ON public.ad_videos;
DROP POLICY IF EXISTS "Admins can update ad_videos" ON public.ad_videos;
DROP POLICY IF EXISTS "Allow public read ad_videos" ON public.ad_videos;
CREATE POLICY "Users manage own ad_videos" ON public.ad_videos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage campaign_configs" ON public.campaign_configs;
CREATE POLICY "Users manage own campaign_configs" ON public.campaign_configs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage zapi_config" ON public.zapi_config;
CREATE POLICY "Users manage own zapi_config" ON public.zapi_config FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins insert own budget history" ON public.campaign_budget_history;
DROP POLICY IF EXISTS "Admins read own budget history" ON public.campaign_budget_history;
CREATE POLICY "Users insert own budget history" ON public.campaign_budget_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own budget history" ON public.campaign_budget_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bm_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bm_account_secrets TO authenticated;
GRANT SELECT, DELETE ON public.webhook_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zapi_config TO authenticated;
GRANT ALL ON public.niches, public.countries, public.bm_accounts, public.bm_account_secrets,
  public.webhook_sales, public.ad_videos, public.campaign_configs, public.zapi_config TO service_role;

-- 4. recreate public BM view with owner scoping
DROP VIEW IF EXISTS public.bm_accounts_public;
CREATE VIEW public.bm_accounts_public WITH (security_invoker = on) AS
  SELECT id, label, slug, ad_account_id, currency, sort_order, is_active, user_id, created_at, updated_at
  FROM public.bm_accounts;
GRANT SELECT ON public.bm_accounts_public TO authenticated;
GRANT ALL ON public.bm_accounts_public TO service_role;

-- 5. seed defaults for new users
CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.niches (user_id, name, keyword, sort_order)
  VALUES (NEW.id, 'Adulto', 'adulto', 1),
         (NEW.id, 'Próstata', 'prosta', 2),
         (NEW.id, 'Emagrecimento', 'ema', 3),
         (NEW.id, 'Diabetes', 'diabe', 4);

  INSERT INTO public.countries (user_id, name, code, flag, currency_code, rate_to_brl, sort_order)
  VALUES (NEW.id, 'Brasil', 'BR', '🇧🇷', 'BRL', 1, 1),
         (NEW.id, 'Uruguai', 'UY', '🇺🇾', 'UYU', 7.93, 2),
         (NEW.id, 'Argentina', 'AR', '🇦🇷', 'ARS', 278.39, 3),
         (NEW.id, 'Paraguai', 'PY', '🇵🇾', 'PYG', 1176.54, 4);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_seed_defaults ON public.profiles;
CREATE TRIGGER on_profile_created_seed_defaults
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_user_defaults();

-- ensure profile creation trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();