import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Multi-tenant: each user has a personal webhook key that identifies the owner of the sale.
    const url = new URL(req.url);
    const webhookKey = (url.searchParams.get("key") || req.headers.get("x-webhook-key") || "").trim();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let ownerId: string | null = null;
    if (webhookKey) {
      const { data: owner } = await admin
        .from("profiles")
        .select("id")
        .eq("webhook_key", webhookKey)
        .maybeSingle();
      ownerId = owner?.id ?? null;
    }

    if (!ownerId) {
      console.error("Webhook rejected: missing or invalid key");
      return new Response(JSON.stringify({ error: "Invalid or missing webhook key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = await req.text();
    console.log("=== RAW WEBHOOK PAYLOAD ===", rawText);

    // Tolerant parser: handles double-encoded JSON, missing commas, and loose "key: value" strings
    const tolerantParse = (text: string): any => {
      let t = text.trim();
      try {
        const once = JSON.parse(t);
        if (typeof once === "string") t = once.trim();
        else return once;
      } catch { /* not valid JSON yet */ }

      try { return JSON.parse(t); } catch { /* still malformed */ }

      // Fix "key" "value" (missing colon) -> "key": "value"
      let fixed = t.replace(/("[A-Za-z_][\wÀ-ÿ]*")\s+("[^"]*"|\d+(?:\.\d+)?|true|false|null)/g, '$1: $2');
      // Fix loose "key: value" inside a single quoted string -> "key": "value"
      fixed = fixed.replace(/"([A-Za-z_][\wÀ-ÿ]*)\s*:\s*([^"]*)"/g, '"$1": "$2"');
      // Add missing commas between property lines
      fixed = fixed.replace(/("\s*:\s*("[^"]*"|[\d.]+|true|false|null))\s*\n(\s*")/g, '$1,\n$3');
      // Remove trailing commas before } or ]
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

      try { return JSON.parse(fixed); } catch (e) {
        console.error("Tolerant parse failed:", e, "fixed=", fixed);
        const grab = (key: string) => {
          const re = new RegExp(`"${key}"\\s*[:=]?\\s*"?([^",}\\n]+)"?`, "i");
          return t.match(re)?.[1]?.trim();
        };
        return {
          campaign: grab("campaign") || grab("campanha") || "",
          creative: grab("creative") || grab("criativo") || "",
          revenue: grab("revenue") || grab("valor") || grab("value") || 0,
          country: grab("country") || grab("pais") || grab("país") || "",
          phone: grab("phone") || grab("telefone") || grab("celular") || grab("whatsapp") || "",
          date: grab("date") || grab("data"),
        };
      }
    };

    let body: any;
    try {
      body = tolerantParse(rawText);
    } catch (e) {
      console.error("Invalid payload:", rawText, e);
      return new Response(JSON.stringify({ error: "Invalid payload", raw: rawText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("=== PARSED BODY ===", JSON.stringify(body));
    const entries = Array.isArray(body) ? body : [body];

    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = admin;

    const toBrtDate = (value?: any) => {
      const d = value ? new Date(value) : new Date();
      const valid = !isNaN(d.getTime()) ? d : new Date();
      return valid.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    };

    // Normalize numeric values like "R$ 1.000,50" or "1000" or 1000
    const toNumber = (v: any): number => {
      if (typeof v === "number") return v;
      if (!v) return 0;
      const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    // Case-insensitive key lookup (accepts VALOR, valor, Valor, etc.)
    const pick = (obj: any, ...keys: string[]): any => {
      if (!obj || typeof obj !== "object") return undefined;
      const map: Record<string, any> = {};
      for (const k of Object.keys(obj)) map[k.toLowerCase().trim()] = obj[k];
      for (const k of keys) {
        const v = map[k.toLowerCase().trim()];
        if (v !== undefined && v !== null && v !== "") return v;
      }
      return undefined;
    };

    const rowsMeta: any[] = [];
    const rows = entries.map((entry: any) => {
      const campaign = String(pick(entry, "campaign", "campanha") || "");
      let country = String(pick(entry, "country", "pais", "país") || "").toUpperCase().trim();

      // Infer country from campaign tag when missing or inconsistent with campaign name
      // e.g. "(UY-PROSTA) ADS03" → UY, "(EMA-UY) E13" → UY, "(AR-ADULTO)" → AR
      const campaignTag = campaign.match(/\(([^)]*)\)/)?.[1] || campaign;
      const campPrefix = campaignTag.match(/(?:^|[^A-Z0-9])(UY|AR|BR|PY)(?:[^A-Z0-9]|$)/i)?.[1]?.toUpperCase();
      if (campPrefix && campPrefix !== country) {
        console.log(`Country override: payload=${country} → campaign prefix=${campPrefix}`);
        country = campPrefix;
      }

      const payloadCurrency = String(pick(entry, "currency", "moeda") || "BRL").toUpperCase().trim();

      // Use ad_title as creative fallback (full name needed for attribution; matcher requires >5 chars)
      let creative = String(pick(entry, "creative", "criativo", "ad", "anuncio", "anúncio") || "").trim();
      const adTitle = String(pick(entry, "ad_title", "ad_name", "adtitle") || "").trim();
      if (adTitle && creative.length <= 5) creative = adTitle;

      const phoneRaw = pick(entry, "phone", "telefone", "celular", "whatsapp", "telephone", "contact_phone");
      const receivedAt = pick(entry, "created_at", "timestamp", "sent_at", "paid_at", "event_time");
      return {
        date: toBrtDate(receivedAt),
        campaign,
        revenue: toNumber(pick(entry, "revenue", "valor", "value", "price", "preco", "preço", "amount")),
        sales: 1,
        creative,
        country,
        // The sale amount arrives in BRL even when the campaign/country is UY or AR.
        // Respect the webhook currency and default to BRL instead of inferring pesos from country.
        currency: ["BRL", "UYU", "ARS", "PYG", "USD"].includes(payloadCurrency) ? payloadCurrency : "BRL",
        phone: phoneRaw ? String(phoneRaw).trim() : null,
        user_id: ownerId,
      };
    });


    const { data, error } = await supabase
      .from("webhook_sales")
      .insert(rows)
      .select();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, inserted: data?.length || 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
