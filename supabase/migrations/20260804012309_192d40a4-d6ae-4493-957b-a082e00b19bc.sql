CREATE TABLE public.manual_metric_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  row_key text not null,
  metric text not null,
  value numeric not null,
  original_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, row_key, metric)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_metric_overrides TO authenticated;
GRANT ALL ON public.manual_metric_overrides TO service_role;

ALTER TABLE public.manual_metric_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own manual_metric_overrides"
ON public.manual_metric_overrides FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_manual_metric_overrides_updated_at
BEFORE UPDATE ON public.manual_metric_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();