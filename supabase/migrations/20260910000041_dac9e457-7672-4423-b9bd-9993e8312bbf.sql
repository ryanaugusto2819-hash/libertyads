ALTER TABLE public.webhook_sales
  ADD COLUMN IF NOT EXISTS upsells integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsell_revenue numeric NOT NULL DEFAULT 0;