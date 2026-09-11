import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { campaignsMatch } from "@/lib/campaignMatching";

interface UpsellTableProps {
  from: string;
  to: string;
  currencyRates?: Record<string, number>;
  countryFilter?: string;
  nichoFilter?: string;
  selectedCampaigns?: string[];
}

interface Row {
  campaign: string;
  sales: number;
  upsells: number;
  upsellRevenue: number;
  revenue: number;
}

const fmt = (n: number) =>
  (isNaN(n) ? 0 : n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const rateColor = (pct: number) => {
  if (pct >= 30) return "text-[#00ff88]";
  if (pct >= 15) return "text-[#ffaa00]";
  return "text-muted-foreground";
};

const UpsellTable = ({ from, to, currencyRates, countryFilter = "all", nichoFilter = "all", selectedCampaigns = [] }: UpsellTableProps) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("webhook_sales")
        .select("campaign, creative, country, currency, revenue, sales, upsells, upsell_revenue")
        .gte("date", from)
        .lte("date", to);
      if (!active) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [from, to]);

  const { grouped, totals } = useMemo(() => {
    const rate = (cur?: string) => {
      const c = (cur || "BRL").toUpperCase();
      const r = currencyRates?.[c];
      return r && r > 0 ? r : 1;
    };

    const filtered = rows.filter((s) => {
      const campaign = String(s.campaign || "");
      const hay = `${campaign} ${s.creative || ""}`.toLowerCase();
      if (countryFilter !== "all" && String(s.country || "").toUpperCase() !== countryFilter.toUpperCase()) return false;
      if (nichoFilter !== "all" && !hay.includes(nichoFilter.toLowerCase())) return false;
      if (selectedCampaigns.length > 0 && !selectedCampaigns.some((c) => campaignsMatch(campaign, c))) return false;
      return true;
    });

    const map = new Map<string, Row>();
    for (const s of filtered) {
      const key = String(s.campaign || "Sem campanha");
      const cur = map.get(key) || { campaign: key, sales: 0, upsells: 0, upsellRevenue: 0, revenue: 0 };
      const r = rate(s.currency);
      cur.sales += Number(s.sales || 0);
      cur.upsells += Number(s.upsells || 0);
      cur.upsellRevenue += Number(s.upsell_revenue || 0) / r;
      cur.revenue += Number(s.revenue || 0) / r;
      map.set(key, cur);
    }

    const grouped = Array.from(map.values()).sort((a, b) => b.upsells - a.upsells || b.sales - a.sales);
    const totals = grouped.reduce(
      (acc, r) => ({
        sales: acc.sales + r.sales,
        upsells: acc.upsells + r.upsells,
        upsellRevenue: acc.upsellRevenue + r.upsellRevenue,
        revenue: acc.revenue + r.revenue,
      }),
      { sales: 0, upsells: 0, upsellRevenue: 0, revenue: 0 }
    );
    return { grouped, totals };
  }, [rows, currencyRates, countryFilter, nichoFilter, selectedCampaigns]);

  const totalRate = totals.sales > 0 ? (totals.upsells / totals.sales) * 100 : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border/50">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tentativas (vendas)</p>
          <p className="text-sm font-bold">{totals.sales}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Upsells</p>
          <p className="text-sm font-bold">{totals.upsells}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversão</p>
          <p className={`text-sm font-bold ${rateColor(totalRate)}`}>{fmt(totalRate)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento Upsell</p>
          <p className="text-sm font-bold">R${fmt(totals.upsellRevenue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket Upsell</p>
          <p className="text-sm font-bold">R${fmt(totals.upsells > 0 ? totals.upsellRevenue / totals.upsells : 0)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-semibold px-4 py-2">Campanha</th>
              <th className="text-right font-semibold px-4 py-2">Vendas</th>
              <th className="text-right font-semibold px-4 py-2">Upsells</th>
              <th className="text-right font-semibold px-4 py-2">% Conversão</th>
              <th className="text-right font-semibold px-4 py-2">Fat. Upsell</th>
              <th className="text-right font-semibold px-4 py-2">Ticket Upsell</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td>
              </tr>
            )}
            {!loading && grouped.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Nenhuma venda no período</td>
              </tr>
            )}
            {!loading &&
              grouped.map((r) => {
                const pct = r.sales > 0 ? (r.upsells / r.sales) * 100 : 0;
                return (
                  <tr key={r.campaign} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2 max-w-[380px] truncate" title={r.campaign}>{r.campaign}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.sales}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.upsells}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${rateColor(pct)}`}>{fmt(pct)}%</td>
                    <td className="px-4 py-2 text-right tabular-nums">R${fmt(r.upsellRevenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      R${fmt(r.upsells > 0 ? r.upsellRevenue / r.upsells : 0)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UpsellTable;
