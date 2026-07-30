// Resolves the calling app user from the Authorization bearer token.
// Every multi-tenant function must scope its data with the returned userId.

export interface CallerIdentity {
  userId: string | null;
  isAdmin: boolean;
  approved: boolean;
}

export async function getCaller(req: Request): Promise<CallerIdentity> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!url || !serviceKey || !token) return { userId: null, isAdmin: false, approved: false };

  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey!, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return { userId: null, isAdmin: false, approved: false };
    const user = await userRes.json();
    const userId = user?.id ? String(user.id) : null;
    if (!userId) return { userId: null, isAdmin: false, approved: false };

    const [roleRes, profileRes] = await Promise.all([
      fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${userId}&role=eq.admin`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
      fetch(`${url}/rest/v1/profiles?select=approved&id=eq.${userId}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
    ]);
    const roles = roleRes.ok ? await roleRes.json() : [];
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const isAdmin = Array.isArray(roles) && roles.length > 0;
    const approved = Array.isArray(profiles) && profiles[0]?.approved === true;
    return { userId, isAdmin, approved: approved || isAdmin };
  } catch (err) {
    console.error("getCaller error", String(err));
    return { userId: null, isAdmin: false, approved: false };
  }
}

export function unauthorized(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
