DROP VIEW public.bm_accounts_public;

CREATE POLICY "Authenticated read bm_accounts" ON public.bm_accounts
FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.bm_accounts FROM authenticated;
GRANT SELECT (id, label, slug, ad_account_id, currency, sort_order, is_active, created_at, updated_at)
  ON public.bm_accounts TO authenticated;

CREATE VIEW public.bm_accounts_public
WITH (security_invoker = on) AS
SELECT id, label, slug, ad_account_id, currency, sort_order, is_active, created_at, updated_at
FROM public.bm_accounts;
GRANT SELECT ON public.bm_accounts_public TO authenticated;
GRANT SELECT ON public.bm_accounts_public TO service_role;