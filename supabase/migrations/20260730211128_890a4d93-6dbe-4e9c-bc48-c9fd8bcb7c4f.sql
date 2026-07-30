-- Recreate the public view as security definer so non-admins can still read non-sensitive columns
DROP VIEW IF EXISTS public.bm_accounts_public;

-- Restrict base table reads to admins only
DROP POLICY IF EXISTS "Authenticated read bm_accounts" ON public.bm_accounts;

CREATE POLICY "Admins read bm_accounts" ON public.bm_accounts
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.bm_accounts FROM authenticated;
GRANT SELECT ON public.bm_accounts TO service_role;

CREATE VIEW public.bm_accounts_public AS
SELECT id, label, slug, ad_account_id, currency, sort_order, is_active, created_at, updated_at
FROM public.bm_accounts;

ALTER VIEW public.bm_accounts_public SET (security_barrier = true);
GRANT SELECT ON public.bm_accounts_public TO authenticated;
GRANT SELECT ON public.bm_accounts_public TO service_role;