// Loads BM accounts registered through the app UI (public.bm_accounts).
// Tokens are read here with the service role and never leave the server.

export interface DbAccountConfig {
  label: string;
  accessToken: string;
  adAccount: string;
  currency?: string;
}

export async function getDbAccountConfigs(): Promise<DbAccountConfig[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/bm_accounts?select=slug,ad_account_id,currency,sort_order,bm_account_secrets(access_token)&is_active=eq.true&order=sort_order.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.error("bm_accounts fetch failed", res.status);
      return [];
    }
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r: any) => r?.slug && r?.ad_account_id && r?.bm_account_secrets?.access_token)
      .map((r: any) => ({
        label: String(r.slug),
        accessToken: String(r.bm_account_secrets.access_token),
        adAccount: String(r.ad_account_id).replace(/^act_/, ""),
        currency: r.currency || "BRL",
      }));
  } catch (err) {
    console.error("bm_accounts fetch error", String(err));
    return [];
  }
}
