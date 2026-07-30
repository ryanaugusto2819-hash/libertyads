CREATE TABLE public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  keyword text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.niches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT ALL ON public.niches TO service_role;
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read niches" ON public.niches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage niches" ON public.niches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_niches_updated_at BEFORE UPDATE ON public.niches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  flag text NOT NULL DEFAULT '',
  currency_code text NOT NULL DEFAULT 'BRL',
  rate_to_brl numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  slug text NOT NULL UNIQUE,
  ad_account_id text NOT NULL,
  access_token text,
  currency text NOT NULL DEFAULT 'BRL',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE, DELETE ON public.bm_accounts TO authenticated;
GRANT ALL ON public.bm_accounts TO service_role;
ALTER TABLE public.bm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins write bm_accounts" ON public.bm_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_bm_accounts_updated_at BEFORE UPDATE ON public.bm_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE VIEW public.bm_accounts_public
WITH (security_invoker = off) AS
SELECT id, label, slug, ad_account_id, currency, sort_order, is_active,
       (access_token IS NOT NULL AND access_token <> '') AS has_token,
       created_at, updated_at
FROM public.bm_accounts;
GRANT SELECT ON public.bm_accounts_public TO authenticated;
GRANT SELECT ON public.bm_accounts_public TO service_role;