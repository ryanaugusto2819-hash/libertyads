import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NicheConfig {
  id: string;
  name: string;
  keyword: string;
  sort_order: number;
  is_active: boolean;
}

export interface CountryConfig {
  id: string;
  name: string;
  code: string;
  flag: string;
  currency_code: string;
  rate_to_brl: number;
  sort_order: number;
  is_active: boolean;
}

export interface BmAccountConfig {
  id: string;
  label: string;
  slug: string;
  ad_account_id: string;
  currency: string;
  sort_order: number;
  is_active: boolean;
}

export const useDashboardSettings = () => {
  const [niches, setNiches] = useState<NicheConfig[]>([]);
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [bmAccounts, setBmAccounts] = useState<BmAccountConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [n, c, b] = await Promise.all([
      supabase.from("niches").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("countries").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("bm_accounts_public").select("*").eq("is_active", true).order("sort_order"),
    ]);
    if (n.data) setNiches(n.data as NicheConfig[]);
    if (c.data) setCountries((c.data as any[]).map((r) => ({ ...r, rate_to_brl: Number(r.rate_to_brl || 1) })));
    if (b.data) setBmAccounts(b.data as BmAccountConfig[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { niches, countries, bmAccounts, loading, reload };
};
