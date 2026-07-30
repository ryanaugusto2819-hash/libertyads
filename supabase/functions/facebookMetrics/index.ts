import { getDbAccountConfigs } from "../_shared/bmAccounts.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MetaInsight {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  cpc: string;
  actions?: { action_type: string; value: string }[];
  video_play_actions?: { action_type: string; value: string }[];
  video_p95_watched_actions?: { action_type: string; value: string }[];
  ad_id: string;
  ad_name: string;
}

interface ProcessedMetric {
  date: string;
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  leads: number;
  costPerLead: number | null;
  video3s: number;
  videoP95: number;
  hookRate: number;
  bodyRate: number;
  bm_account: string;
}

function getActionValue(actions: { action_type: string; value: string }[] | undefined, type: string): number {
  if (!actions) return 0;
  const found = actions.find((a) => a.action_type === type);
  return found ? parseFloat(found.value) : 0;
}

function getFirstActionValue(actions: { action_type: string; value: string }[] | undefined): number {
  if (!actions || actions.length === 0) return 0;
  return parseFloat(actions[0].value) || 0;
}

interface AccountConfig {
  label: string;
  accessToken: string;
  adAccount: string;
}

function getAccountConfigs(): AccountConfig[] {
  const configs: AccountConfig[] = [];
  const mainToken = Deno.env.get("META_ACCESS_TOKEN");

  const a1 = Deno.env.get("META_AD_ACCOUNT");
  if (mainToken && a1) configs.push({ label: "bm1", accessToken: mainToken, adAccount: a1 });

  const a2 = Deno.env.get("META_AD_ACCOUNT_2");
  const t2 = Deno.env.get("META_ACCESS_TOKEN_2") || mainToken;
  if (t2 && a2) configs.push({ label: "bm2", accessToken: t2, adAccount: a2 });

  const a3 = Deno.env.get("META_AD_ACCOUNT_3");
  const t3 = Deno.env.get("META_ACCESS_TOKEN_3") || mainToken;
  if (t3 && a3) configs.push({ label: "bm3", accessToken: t3, adAccount: a3 });

  const t4 = Deno.env.get("META_ACCESS_TOKEN_4");
  const a4 = Deno.env.get("META_AD_ACCOUNT_4");
  if (t4 && a4) configs.push({ label: "bm4", accessToken: t4, adAccount: a4 });

  const t5 = Deno.env.get("META_ACCESS_TOKEN_5");
  const a5 = Deno.env.get("META_AD_ACCOUNT_5");
  if (t5 && a5) configs.push({ label: "bm5", accessToken: t5, adAccount: a5 });

  const a6 = Deno.env.get("META_AD_ACCOUNT_6");
  const t6 = Deno.env.get("META_ACCESS_TOKEN_6") || mainToken;
  if (t6 && a6) configs.push({ label: "bm6", accessToken: t6, adAccount: a6 });

  const a7 = Deno.env.get("META_AD_ACCOUNT_7");
  const t7 = Deno.env.get("META_ACCESS_TOKEN_7") || mainToken;
  if (t7 && a7) configs.push({ label: "bm7", accessToken: t7, adAccount: a7 });

  const a8 = Deno.env.get("META_AD_ACCOUNT_8");
  const t8 = Deno.env.get("META_ACCESS_TOKEN_8") || mainToken;
  if (t8 && a8) configs.push({ label: "bm8", accessToken: t8, adAccount: a8 });

  const a9 = Deno.env.get("META_AD_ACCOUNT_9");
  const t9 = Deno.env.get("META_ACCESS_TOKEN_9") || mainToken;
  if (t9 && a9) configs.push({ label: "bm9", accessToken: t9, adAccount: a9 });

  const a10 = Deno.env.get("META_AD_ACCOUNT_10") || "1486615489258696";
  const t10 = Deno.env.get("META_ACCESS_TOKEN_10") || Deno.env.get("META_ACCESS_TOKEN_9") || mainToken;
  if (t10 && a10) configs.push({ label: "bm10", accessToken: t10, adAccount: a10 });

  const a11 = Deno.env.get("META_AD_ACCOUNT_11") || "1985903638826476";
  const t11 = Deno.env.get("META_ACCESS_TOKEN_11");
  if (t11 && a11) configs.push({ label: "bm11", accessToken: t11, adAccount: a11 });



  return configs;
}

async function fetchAccountMetrics(
  config: AccountConfig,
  from: string,
  to: string,
): Promise<{ data: ProcessedMetric[]; error?: any; connected: boolean }> {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "cpc",
    "actions",
    "video_play_actions",
    "video_p95_watched_actions",
    "ad_id",
    "ad_name",
    "campaign_id",
    "campaign_name",
  ].join(",");
  const timeRange = JSON.stringify({ since: from, until: to });
  const url = new URL(`https://graph.facebook.com/v19.0/act_${config.adAccount}/insights`);
  url.searchParams.set("level", "ad");
  url.searchParams.set("time_range", timeRange);
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", config.accessToken);

  const allData: MetaInsight[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    let json: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(nextUrl);
      json = await res.json();
      if (json.error && (json.error.code === 4 || json.error.code === 17 || json.error.is_transient)) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 30000)));
        continue;
      }
      break;
    }
    if (json.error) {
      const metaMessage = String(json.error?.message || "");
      const isConnectionError = json.error?.code === 190 || /ads_management|ads_read/i.test(metaMessage);
      return { data: [], connected: !isConnectionError, error: json.error };
    }
    if (json.data) allData.push(...json.data);
    nextUrl = json.paging?.next || null;
  }

  const USD_TO_BRL = 5.10;
  const isUsd = config.label === "bm2" || config.label === "bm3" || config.label === "bm6" || config.label === "bm7" || config.label === "bm8";

  const processed: ProcessedMetric[] = allData.map((row) => {
    const rawSpend = parseFloat(row.spend) || 0;
    const spend = isUsd ? rawSpend * USD_TO_BRL : rawSpend;
    const impressions = parseInt(row.impressions) || 0;
    const clicks = parseInt(row.clicks) || 0;
    const leads = getActionValue(row.actions, "onsite_conversion.total_messaging_connection");
    const video3s = getActionValue(row.actions, "video_view");
    const videoP95 = getFirstActionValue(row.video_p95_watched_actions);
    return {
      date: row.date_start,
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      campaign_id: (row as any).campaign_id || "",
      campaign_name: (row as any).campaign_name || "",
      spend,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      leads,
      costPerLead: leads > 0 ? spend / leads : null,
      video3s,
      videoP95,
      hookRate: impressions > 0 ? (video3s / impressions) * 100 : 0,
      bodyRate: impressions > 0 ? (videoP95 / impressions) * 100 : 0,
      bm_account: config.label,
    };
  });

  return { data: processed, connected: true };
}

async function getAllConfigs(): Promise<AccountConfig[]> {
  const configs = getAccountConfigs();
  const dbConfigs = await getDbAccountConfigs();
  for (const d of dbConfigs) {
    if (!configs.some((c) => c.label === d.label)) {
      configs.push({ label: d.label, accessToken: d.accessToken, adAccount: d.adAccount });
    }
  }
  return configs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST")
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const { from, to, account } = await req.json();
    if (!from || !to)
      return new Response(JSON.stringify({ error: "Missing from/to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const allConfigs = await getAllConfigs();
    if (allConfigs.length === 0)
      return new Response(JSON.stringify({ error: "No Meta accounts configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const configs = account && account !== "all" ? allConfigs.filter((c) => c.label === account) : allConfigs;
    const results = await Promise.allSettled(configs.map((c) => fetchAccountMetrics(c, from, to)));

    const allProcessed: ProcessedMetric[] = [];
    const errors: any[] = [];
    let anyConnected = false;

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        if (r.value.connected) anyConnected = true;
        allProcessed.push(...r.value.data);
        if (r.value.error) errors.push({ account: configs[i].label, error: r.value.error });
      } else {
        errors.push({ account: configs[i].label, error: String(r.reason) });
      }
    });

    const byDate: Record<string, ProcessedMetric[]> = {};
    for (const m of allProcessed) {
      if (!byDate[m.date]) byDate[m.date] = [];
      byDate[m.date].push(m);
    }

    return new Response(
      JSON.stringify({
        data: allProcessed,
        byDate,
        total: allProcessed.length,
        connected: anyConnected || errors.length === 0,
        accounts: allConfigs.map((c) => c.label),
        ...(errors.length > 0 ? { errors } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
