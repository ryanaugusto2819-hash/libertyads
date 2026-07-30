import { getCaller, unauthorized } from "../_shared/auth.ts";
import { getDbAccountConfigs } from "../_shared/bmAccounts.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAllTokens(preferred: string | undefined, userId: string, isAdmin: boolean): Promise<{ name: string; token: string }[]> {
  // Legacy env tokens belong to the platform owner (admin) only.
  const map: Record<string, string | undefined> = isAdmin ? {
    main: Deno.env.get("META_ACCESS_TOKEN"),
    bm2: Deno.env.get("META_ACCESS_TOKEN_2"),
    bm3: Deno.env.get("META_ACCESS_TOKEN_3"),
    bm4: Deno.env.get("META_ACCESS_TOKEN_4"),
    bm5: Deno.env.get("META_ACCESS_TOKEN_5"),
    bm6: Deno.env.get("META_ACCESS_TOKEN_6"),
    bm7: Deno.env.get("META_ACCESS_TOKEN_7"),
    bm8: Deno.env.get("META_ACCESS_TOKEN_8"),
    bm9: Deno.env.get("META_ACCESS_TOKEN_9"),
    bm10: Deno.env.get("META_ACCESS_TOKEN_10") || Deno.env.get("META_ACCESS_TOKEN_9"),
    bm11: Deno.env.get("META_ACCESS_TOKEN_11"),

  } : {};
  for (const d of await getDbAccountConfigs(userId)) {
    if (!map[d.label]) map[d.label] = d.accessToken;
  }
  const order = preferred && map[preferred]
    ? [preferred, ...Object.keys(map).filter((k) => k !== preferred)]
    : Object.keys(map);
  const out: { name: string; token: string }[] = [];
  const seen = new Set<string>();
  for (const k of order) {
    const t = map[k];
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push({ name: k, token: t });
    }
  }
  return out;
}

const USD_BMS = new Set(["bm2", "bm3", "bm4", "bm5", "bm6", "bm7", "bm8"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await getCaller(req);
    if (!caller.userId || !caller.approved) return unauthorized(corsHeaders);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id, daily_budget, bm_account } = await req.json();

    if (!campaign_id || daily_budget == null) {
      return new Response(JSON.stringify({ error: "Missing campaign_id or daily_budget" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens = await getAllTokens(bm_account, caller.userId, caller.isAdmin);
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ error: "No Meta access tokens configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://graph.facebook.com/v19.0/${campaign_id}`;
    let lastError: any = null;

    for (const { name, token } of tokens) {
      const isUsd = USD_BMS.has(name);
      const budgetValue = isUsd ? daily_budget / 5.10 : daily_budget;
      const budgetInCents = Math.round(budgetValue * 100);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ daily_budget: budgetInCents.toString(), access_token: token }),
      });
      const json = await res.json();

      if (!json.error) {
        return new Response(JSON.stringify({ success: true, data: json, used_token: name }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      lastError = json.error;
      // Only fall through to next token on permission/not-found errors
      const code = json.error?.code;
      if (code !== 100 && code !== 200 && code !== 190) {
        break;
      }
    }

    return new Response(JSON.stringify({ error: "Meta API error", details: lastError }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", message: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
