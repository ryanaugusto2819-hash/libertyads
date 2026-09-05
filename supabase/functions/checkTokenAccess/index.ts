import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve_handler();

function serve_handler() {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    let accountId = "1985903638826476";
    try {
      const body = await req.json();
      if (body?.account_id) accountId = String(body.account_id);
    } catch (_) { /* no body */ }

    const tokens: Record<string, string | undefined> = {
      main: Deno.env.get("META_ACCESS_TOKEN"),
      bm2: Deno.env.get("META_ACCESS_TOKEN_2"),
      bm3: Deno.env.get("META_ACCESS_TOKEN_3"),
      bm4: Deno.env.get("META_ACCESS_TOKEN_4"),
      bm5: Deno.env.get("META_ACCESS_TOKEN_5"),
      bm7: Deno.env.get("META_ACCESS_TOKEN_7"),
      bm8: Deno.env.get("META_ACCESS_TOKEN_8"),
      bm9: Deno.env.get("META_ACCESS_TOKEN_9"),
      bm11: Deno.env.get("META_ACCESS_TOKEN_11"),
      bm12: Deno.env.get("META_ACCESS_TOKEN_12"),
    };

    const results: Record<string, unknown> = {};
    for (const [name, token] of Object.entries(tokens)) {
      if (!token) { results[name] = "not configured"; continue; }
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/act_${accountId}?fields=name,currency&access_token=${token}`,
        );
        const json = await res.json();
        results[name] = json.error ? { error: json.error.message } : { ok: true, ...json };
      } catch (e) {
        results[name] = { error: String(e) };
      }
    }

    return new Response(JSON.stringify({ account_id: accountId, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  });
}
