-- 1. Secrets table (admin/service only)
CREATE TABLE public.bm_account_secrets (
  bm_account_id uuid PRIMARY KEY REFERENCES public.bm_accounts(id) ON DELETE CASCADE,
  access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bm_account_secrets TO authenticated;
GRANT ALL ON public.bm_account_secrets TO service_role;

ALTER TABLE public.bm_account_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bm_account_secrets" ON public.bm_account_secrets
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bm_account_secrets_updated_at
BEFORE UPDATE ON public.bm_account_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing tokens
INSERT INTO public.bm_account_secrets (bm_account_id, access_token)
SELECT id, access_token FROM public.bm_accounts WHERE access_token IS NOT NULL;

-- 3. Drop sensitive column from bm_accounts
DROP VIEW IF EXISTS public.bm_accounts_public;
ALTER TABLE public.bm_accounts DROP COLUMN access_token;

-- 4. bm_accounts is now non-sensitive: authenticated may read it
DROP POLICY IF EXISTS "Admins read bm_accounts" ON public.bm_accounts;
CREATE POLICY "Authenticated read bm_accounts" ON public.bm_accounts
FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.bm_accounts TO authenticated;

CREATE VIEW public.bm_accounts_public WITH (security_invoker = on) AS
SELECT id, label, slug, ad_account_id, currency, sort_order, is_active, created_at, updated_at
FROM public.bm_accounts;
GRANT SELECT ON public.bm_accounts_public TO authenticated;
GRANT SELECT ON public.bm_accounts_public TO service_role;