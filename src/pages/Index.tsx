import { useEffect, useMemo, useState, useCallback } from "react";
import { DollarSign, Users, Target, BarChart3, Percent, TrendingUp, Receipt, Wallet, Activity, RefreshCw, Eye, EyeOff, Clock, Shield, LogOut, Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import KPICard from "@/components/dashboard/KPICard";
import DateFilter from "@/components/dashboard/DateFilter";
import AdsTable from "@/components/dashboard/AdsTable";
import SpendChart from "@/components/dashboard/SpendChart";
import WebhookHistory from "@/components/dashboard/WebhookHistory";
import SettingsDialog from "@/components/dashboard/SettingsDialog";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

interface SaleEntry {
  date: string;
  creative: string;
  campaign: string;
  sales: number;
  revenue: number;
  country: string;
  currency: string;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDateRange = (range: string) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  switch (range) {
    case "yesterday":
      return { from: yesterday, to: yesterday };
    case "7days":
      return { from: subDays(today, 6), to: today };
    case "30days":
      return { from: subDays(today, 29), to: today };
    case "today":
      return { from: today, to: today };
    default:
      return { from: subDays(today, 29), to: today };
  }
};

const getPreviousDateRange = (from: Date, to: Date) => {
  const days = differenceInDays(to, from) + 1;
  return {
    from: subDays(from, days),
    to: subDays(from, 1),
  };
};

const UYU_TO_BRL = 7.93;
const ARS_TO_BRL = 278.39;
const PYG_TO_BRL = 1176.54;
const USD_TO_BRL = 5.10;

const DEFAULT_RATES: Record<string, number> = {
  UYU: UYU_TO_BRL,
  ARS: ARS_TO_BRL,
  PYG: PYG_TO_BRL,
};

const STATIC_BMS = ["bm11"];

const applyUsdConversion = (items: any[]) =>
  items.map((item) => {
    if (item.bm_account !== "bm4" && item.bm_account !== "bm5") return item;
    return {
      ...item,
      spend: Number(item.spend || 0) * USD_TO_BRL,
      cpm: Number(item.cpm || 0) * USD_TO_BRL,
      cpc: Number(item.cpc || 0) * USD_TO_BRL,
      costPerLead: item.costPerLead != null ? Number(item.costPerLead) * USD_TO_BRL : null,
    };
  });

const convertRevenue = (sale: SaleEntry, rates: Record<string, number>) => {
  const raw = Number(sale.revenue || 0);
  const currency = (sale.currency || "").toUpperCase();
  const rate = Number(rates[currency] || 0);
  return rate > 0 ? raw / rate : raw;
};

const calcKpis = (data: any[], salesData: SaleEntry[], rates: Record<string, number> = DEFAULT_RATES) => {
  const totalSpent = data.reduce((sum, d) => sum + Number(d.spend || 0), 0);
  const totalLeads = data.reduce((sum, d) => sum + Number(d.leads || 0), 0);
  const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
  const totalRevenue = salesData.reduce((sum, s) => sum + convertRevenue(s, rates), 0);
  const totalSales = salesData.reduce((sum, s) => sum + Number(s.sales || 0), 0);
  const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const roi = totalSpent > 0 ? totalRevenue / totalSpent : 0;
  const lucro70 = totalRevenue * 0.7 - totalSpent;
  const lucro60 = totalRevenue * 0.6 - totalSpent;
  const lucro50 = totalRevenue * 0.5 - totalSpent;
  const lucro40 = totalRevenue * 0.4 - totalSpent;
  const cpa = totalSales > 0 ? totalSpent / totalSales : 0;

  return { totalSpent, totalLeads, costPerLead, cpa, roi, conversionRate, averageTicket, totalSales, totalRevenue, lucro70, lucro60, lucro50, lucro40 };
};


const calcTrend = (current: number, previous: number, invertColors = false) => {
  if (previous === 0 && current === 0) return { trend: "0%", trendUp: false, trendNeutral: true };
  if (previous === 0) return { trend: "+100%", trendUp: !invertColors, trendNeutral: false };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct > 0;
  return {
    trend: `${isUp ? "+" : ""}${pct.toFixed(1)}%`,
    trendUp: invertColors ? !isUp : isUp,
    trendNeutral: Math.abs(pct) < 0.5,
  };
};

const getFunctionErrorMessage = (result: { data?: any; error?: { message?: string } }, fallback: string) => {
  if (result.error?.message) return result.error.message;
  if (result.data?.details?.message) return result.data.details.message;
  if (result.data?.error) return result.data.error;
  return fallback;
};

const normalizeMetaErrorMessage = (message: string) => {
  if (/ads_management|ads_read/i.test(message)) {
    return "A conexão da Meta precisa ser refeita no novo App/BM. Gere um novo token com ads_read e ads_management para a conta correta.";
  }
  return message;
};

const hasCountryTag = (value: string, tag: string) => {
  const normalized = (value || "").toUpperCase();
  const safeTag = tag.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!safeTag) return false;
  return new RegExp(`(^|[^A-Z0-9])${safeTag}([^A-Z0-9]|$)`).test(normalized);
};

const COUNTRY_ALIASES: Record<string, RegExp> = {
  BR: /BRASIL|BRAZIL/i,
  UY: /URUGUAI|URUGUAY/i,
  AR: /ARGENTINA/i,
  PY: /PARAGUAI|PARAGUAY/i,
};

const adSource = (ad: any) => [ad.campaign_name, ad.ad_name, ad.name].filter(Boolean).join(" ");
const saleSource = (sale: any) => [sale.creative, sale.campaign, sale.country].filter(Boolean).join(" ");

const matchesCountry = (source: string, country: { code: string; name: string }) => {
  if (hasCountryTag(source, country.code)) return true;
  if (COUNTRY_ALIASES[country.code.toUpperCase()]?.test(source)) return true;
  const name = (country.name || "").trim();
  return name.length > 2 && new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(source);
};


const SkeletonCard = () => (
  <div className="glass-card p-5 relative overflow-hidden">
    <div className="absolute inset-x-0 top-0 h-[3px] shimmer" />
    <div className="flex items-start justify-between mb-4">
      <div className="shimmer h-2.5 w-20 rounded-full" />
      <div className="shimmer h-11 w-11 rounded-xl" />
    </div>
    <div className="shimmer h-8 w-28 rounded-lg mt-1" />
    <div className="shimmer h-5 w-16 rounded-full mt-3" />
  </div>
);

const Index = () => {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState("today");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [data, setData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [prevData, setPrevData] = useState<any[]>([]);
  const [prevSalesData, setPrevSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [nichoFilter, setNichoFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [bmFilter, setBmFilter] = useState<string>("all");
  const [campaignBudgets, setCampaignBudgets] = useState<Record<string, { daily_budget: number; name: string; status: string }>>({});
  const { niches, countries, bmAccounts, reload: reloadSettings } = useDashboardSettings();

  const currencyRates = useMemo(
    () => ({
      ...DEFAULT_RATES,
      ...Object.fromEntries(countries.map((c) => [c.currency_code.toUpperCase(), Number(c.rate_to_brl) || 1])),
    }),
    [countries]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let from: Date, to: Date;
      if (range === "custom" && customRange) {
        from = customRange.from;
        to = customRange.to;
      } else {
        const dates = getDateRange(range);
        from = dates.from;
        to = dates.to;
      }

      const prev = getPreviousDateRange(from, to);

      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      const prevFromStr = format(prev.from, "yyyy-MM-dd");
      const prevToStr = format(prev.to, "yyyy-MM-dd");

      const accountParam = bmFilter !== "all" ? bmFilter : "all";

      const [metricsRes, prevMetricsRes, salesRes, prevSalesRes, budgetsRes] = await Promise.allSettled([
        supabase.functions.invoke("facebookMetrics", {
          body: { from: fromStr, to: toStr, account: accountParam },
        }),
        supabase.functions.invoke("facebookMetrics", {
          body: { from: prevFromStr, to: prevToStr, account: accountParam },
        }),
        supabase.from("webhook_sales").select("*").gte("date", fromStr).lte("date", toStr),
        supabase.from("webhook_sales").select("*").gte("date", prevFromStr).lte("date", prevToStr),
        supabase.functions.invoke("getCampaignBudgets", {
          body: { account: accountParam },
        }),
      ]);

      const nextErrors = new Set<string>();

      if (metricsRes.status === "fulfilled") {
        if (metricsRes.value.error || metricsRes.value.data?.error) {
          setData([]);
          nextErrors.add(normalizeMetaErrorMessage(getFunctionErrorMessage(metricsRes.value, "Erro ao buscar métricas")));
        } else {
          const items = metricsRes.value.data?.data ?? [];
          setData(Array.isArray(items) ? applyUsdConversion(items) : []);
        }
      } else {
        setData([]);
        nextErrors.add("Erro ao buscar métricas");
      }

      if (prevMetricsRes.status === "fulfilled") {
        if (prevMetricsRes.value.error || prevMetricsRes.value.data?.error) {
          setPrevData([]);
        } else {
          const prevItems = prevMetricsRes.value.data?.data ?? [];
          setPrevData(Array.isArray(prevItems) ? applyUsdConversion(prevItems) : []);
        }
      } else {
        setPrevData([]);
      }

      if (salesRes.status === "fulfilled") {
        if (salesRes.value.error) {
          setSalesData([]);
          nextErrors.add("Erro ao buscar vendas");
        } else {
          const filtered = (salesRes.value.data || []).map((s: any) => ({
            date: s.date,
            creative: s.creative || s.campaign || "",
            campaign: s.campaign || "",
            sales: Number(s.sales || 0),
            revenue: Number(s.revenue || 0),
            country: s.country || "",
            currency: s.currency || "BRL",
          }));
          setSalesData(filtered);
        }
      } else {
        setSalesData([]);
        nextErrors.add("Erro ao buscar vendas");
      }

      if (prevSalesRes.status === "fulfilled") {
        if (prevSalesRes.value.error) {
          setPrevSalesData([]);
        } else {
          const prevFiltered = (prevSalesRes.value.data || []).map((s: any) => ({
            date: s.date,
            creative: s.creative || s.campaign || "",
            campaign: s.campaign || "",
            sales: Number(s.sales || 0),
            revenue: Number(s.revenue || 0),
            country: s.country || "",
            currency: s.currency || "BRL",
          }));
          setPrevSalesData(prevFiltered);
        }
      } else {
        setPrevSalesData([]);
      }

      if (budgetsRes.status === "fulfilled") {
        if (budgetsRes.value.error || budgetsRes.value.data?.error) {
          setCampaignBudgets({});
          nextErrors.add(normalizeMetaErrorMessage(getFunctionErrorMessage(budgetsRes.value, "Erro ao buscar orçamentos")));
        } else {
          const rawBudgets = budgetsRes.value.data?.budgets ?? {};
          const convertedBudgets = Object.fromEntries(
            Object.entries(rawBudgets).map(([id, b]: [string, any]) => [
              id,
              b.bm_account === "bm4" || b.bm_account === "bm5"
                ? { ...b, daily_budget: Number(b.daily_budget || 0) * USD_TO_BRL }
                : b,
            ])
          );
          setCampaignBudgets(convertedBudgets);
        }
      } else {
        setCampaignBudgets({});
      }

      setError(Array.from(nextErrors)[0] ?? null);
    } catch (err: any) {
      console.error("Erro:", err);
      setError(err.message || "Erro inesperado");
      setData([]);
      setSalesData([]);
      setPrevData([]);
      setPrevSalesData([]);
      setCampaignBudgets({});
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, customRange, bmFilter]);

  const defaultCountryCode = countries[0]?.code ?? "";

  const matchesCountryFilter = (source: string) => {
    const target = countries.find((c) => c.code === countryFilter);
    if (!target) return true;
    if (matchesCountry(source, target)) return true;
    if (target.code !== defaultCountryCode) return false;
    // O país de menor ordem também recebe tudo que não tem sigla de outro país
    return !countries.some((c) => c.code !== target.code && matchesCountry(source, c));
  };

  const isAdCountry = (ad: any) => matchesCountryFilter(adSource(ad));

  const isAdNicho = (ad: any) => {
    const source = [ad.campaign_name, ad.ad_name, ad.name].filter(Boolean).join(" ").toLowerCase();
    return source.includes(nichoFilter.toLowerCase());
  };

  const isSaleNicho = (sale: any) => {
    const source = [sale.campaign || "", sale.creative || ""].join(" ").toLowerCase();
    return source.includes(nichoFilter.toLowerCase());
  };


  const filteredData = useMemo(() => {
    let result = data;
    if (countryFilter !== "all") result = result.filter(ad => isAdCountry(ad));
    if (nichoFilter !== "all") result = result.filter(ad => isAdNicho(ad));
    return result;
  }, [data, countryFilter, nichoFilter, countries]);

  // Get ad/campaign names from filtered data to filter sales by nicho
  const filteredSaleSources = useMemo(() => {
    return new Set(
      filteredData
        .flatMap(ad => [ad.ad_name || ad.name || "", ad.campaign_name || ""])
        .map(value => value.toLowerCase().trim())
        .filter(Boolean)
    );
  }, [filteredData]);

  const matchesFilteredSaleSource = (sale: any, sourceSet: Set<string>) => {
    const candidates = [sale.creative || "", sale.campaign || ""]
      .map(value => value.toLowerCase().trim())
      .filter(Boolean);

    return candidates.some((candidate) => {
      if (sourceSet.has(candidate)) return true;
      const stripped = candidate.replace(/ ar$/, "");
      if (stripped !== candidate && sourceSet.has(stripped)) return true;
      return candidate.length > 5 && Array.from(sourceSet).some(source => source.includes(candidate) || candidate.includes(source));
    });
  };

  const filteredSalesData = useMemo(() => {
    let result = salesData;
    if (countryFilter !== "all") {
      result = result.filter(s => matchesCountryFilter(saleSource(s)));
    }
    if (nichoFilter !== "all") {
      result = result.filter(s => isSaleNicho(s) || matchesFilteredSaleSource(s, filteredSaleSources));
    }
    return result;
  }, [salesData, countryFilter, nichoFilter, filteredSaleSources, countries]);

  const filteredPrevData = useMemo(() => {
    let result = prevData;
    if (countryFilter !== "all") result = result.filter(ad => isAdCountry(ad));
    if (nichoFilter !== "all") result = result.filter(ad => isAdNicho(ad));
    return result;
  }, [prevData, countryFilter, nichoFilter, countries]);


  const filteredPrevSaleSources = useMemo(() => {
    return new Set(
      filteredPrevData
        .flatMap(ad => [ad.ad_name || ad.name || "", ad.campaign_name || ""])
        .map(value => value.toLowerCase().trim())
        .filter(Boolean)
    );
  }, [filteredPrevData]);

  const filteredPrevSalesData = useMemo(() => {
    let result = prevSalesData;
    if (countryFilter !== "all") {
      result = result.filter(s => matchesCountryFilter(saleSource(s)));
    }
    if (nichoFilter !== "all") {
      result = result.filter(s => isSaleNicho(s) || matchesFilteredSaleSource(s, filteredPrevSaleSources));
    }
    return result;
  }, [prevSalesData, countryFilter, nichoFilter, filteredPrevSaleSources, countries]);


  const deduplicatedAds = useMemo(() => {
    const map = new Map<string, any>();
    filteredData.forEach((ad) => {
      const campaignName = (ad.campaign_name || "").toLowerCase().trim();
      const key = campaignName || (ad.ad_name || ad.name || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.spend = (existing.spend || 0) + Number(ad.spend || 0);
        existing.leads = (existing.leads || 0) + Number(ad.leads || 0);
        existing.impressions = (existing.impressions || 0) + Number(ad.impressions || 0);
        existing.clicks = (existing.clicks || 0) + Number(ad.clicks || 0);
        existing.reach = (existing.reach || 0) + Number(ad.reach || 0);
        if (ad.status === "active") existing.status = "active";
        existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.costPerLead = existing.leads > 0 ? existing.spend / existing.leads : 0;
        existing.cpl = existing.costPerLead;
        const totalImpressions = existing.impressions;
        if (ad.hookRate != null) {
          existing._hookWeighted = (existing._hookWeighted || 0) + (ad.hookRate || 0) * Number(ad.impressions || 0);
          existing.hookRate = totalImpressions > 0 ? existing._hookWeighted / totalImpressions : 0;
        }
        if (ad.bodyRate != null) {
          existing._bodyWeighted = (existing._bodyWeighted || 0) + (ad.bodyRate || 0) * Number(ad.impressions || 0);
          existing.bodyRate = totalImpressions > 0 ? existing._bodyWeighted / totalImpressions : 0;
        }
        // Collect unique campaign_ids
        if (ad.campaign_id && !existing._campaignIds.has(ad.campaign_id)) {
          existing._campaignIds.add(ad.campaign_id);
        }
      } else {
        const campaignIds = new Set<string>();
        if (ad.campaign_id) campaignIds.add(ad.campaign_id);
        map.set(key, { ...ad, _hookWeighted: (ad.hookRate || 0) * Number(ad.impressions || 0), _bodyWeighted: (ad.bodyRate || 0) * Number(ad.impressions || 0), _campaignIds: campaignIds });
      }
    });
    return Array.from(map.values()).map(ad => ({
      ...ad,
      campaignIds: Array.from(ad._campaignIds || []),
    }));
  }, [filteredData]);

  const deduplicatedPrevAds = useMemo(() => {
    const map = new Map<string, any>();
    filteredPrevData.forEach((ad) => {
      const campaignName = (ad.campaign_name || "").toLowerCase().trim();
      const key = campaignName || (ad.ad_name || ad.name || "").toLowerCase().trim();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.spend = (existing.spend || 0) + Number(ad.spend || 0);
        existing.leads = (existing.leads || 0) + Number(ad.leads || 0);
        existing.impressions = (existing.impressions || 0) + Number(ad.impressions || 0);
        existing.clicks = (existing.clicks || 0) + Number(ad.clicks || 0);
        existing.reach = (existing.reach || 0) + Number(ad.reach || 0);
        if (ad.status === "active") existing.status = "active";
        existing.cpm = existing.impressions > 0 ? (existing.spend / existing.impressions) * 1000 : 0;
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.costPerLead = existing.leads > 0 ? existing.spend / existing.leads : 0;
        existing.cpl = existing.costPerLead;
        const totalImpressions = existing.impressions;
        if (ad.hookRate != null) {
          existing._hookWeighted = (existing._hookWeighted || 0) + (ad.hookRate || 0) * Number(ad.impressions || 0);
          existing.hookRate = totalImpressions > 0 ? existing._hookWeighted / totalImpressions : 0;
        }
        if (ad.bodyRate != null) {
          existing._bodyWeighted = (existing._bodyWeighted || 0) + (ad.bodyRate || 0) * Number(ad.impressions || 0);
          existing.bodyRate = totalImpressions > 0 ? existing._bodyWeighted / totalImpressions : 0;
        }
      } else {
        map.set(key, { ...ad, _hookWeighted: (ad.hookRate || 0) * Number(ad.impressions || 0), _bodyWeighted: (ad.bodyRate || 0) * Number(ad.impressions || 0) });
      }
    });
    return Array.from(map.values());
  }, [filteredPrevData]);

  // Opções de campanha para o filtro da Visão Geral
  const campaignOptions = useMemo(() => {
    const set = new Set<string>();
    filteredData.forEach((ad) => {
      const name = (ad.campaign_name || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [filteredData]);

  useEffect(() => {
    if (campaignFilter !== "all" && !campaignOptions.includes(campaignFilter)) {
      setCampaignFilter("all");
    }
  }, [campaignOptions, campaignFilter]);

  const normName = (v: string) => (v || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const matchesCampaignFilter = (value: string) => {
    if (campaignFilter === "all") return true;
    const target = normName(campaignFilter);
    const candidate = normName(value);
    if (!candidate || !target) return false;
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  };

  const kpiAds = useMemo(
    () => (campaignFilter === "all" ? filteredData : filteredData.filter((ad) => matchesCampaignFilter(ad.campaign_name || ""))),
    [filteredData, campaignFilter]
  );
  const kpiPrevAds = useMemo(
    () => (campaignFilter === "all" ? filteredPrevData : filteredPrevData.filter((ad) => matchesCampaignFilter(ad.campaign_name || ""))),
    [filteredPrevData, campaignFilter]
  );
  const kpiSales = useMemo(
    () => (campaignFilter === "all" ? filteredSalesData : filteredSalesData.filter((s) => matchesCampaignFilter(s.campaign || ""))),
    [filteredSalesData, campaignFilter]
  );
  const kpiPrevSales = useMemo(
    () => (campaignFilter === "all" ? filteredPrevSalesData : filteredPrevSalesData.filter((s) => matchesCampaignFilter(s.campaign || ""))),
    [filteredPrevSalesData, campaignFilter]
  );

  const kpi = useMemo(() => calcKpis(kpiAds, kpiSales, currencyRates), [kpiAds, kpiSales, currencyRates]);
  const prevKpi = useMemo(() => calcKpis(kpiPrevAds, kpiPrevSales, currencyRates), [kpiPrevAds, kpiPrevSales, currencyRates]);

  // Metrics where lower is better (invert trend colors)
  const spentTrend = calcTrend(kpi.totalSpent, prevKpi.totalSpent, true);
  const leadsTrend = calcTrend(kpi.totalLeads, prevKpi.totalLeads);
  const cplTrend = calcTrend(kpi.costPerLead, prevKpi.costPerLead, true);
  const salesTrend = calcTrend(kpi.totalSales, prevKpi.totalSales);
  const cpaTrend = calcTrend(kpi.cpa, prevKpi.cpa, true);
  const revenueTrend = calcTrend(kpi.totalRevenue, prevKpi.totalRevenue);
  const roiTrend = calcTrend(kpi.roi, prevKpi.roi);
  const convTrend = calcTrend(kpi.conversionRate, prevKpi.conversionRate);
  const ticketTrend = calcTrend(kpi.averageTicket, prevKpi.averageTicket);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 header-glow px-6 py-3.5"
        style={{ background: "hsl(258 35% 5% / 0.85)", backdropFilter: "blur(24px)" }}>
        {/* Top purple line */}
        <div className="absolute inset-x-0 top-0 h-px accent-bar-purple opacity-60" />
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(109,40,217,0.2))",
                boxShadow: "0 0 24px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-gradient-neon">Facebook Ads</h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase">Dashboard de Performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdate && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <Tabs value={bmFilter} onValueChange={(v) => setBmFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Todas</TabsTrigger>
                {STATIC_BMS.map((slug) => (
                  <TabsTrigger key={slug} value={slug} className="text-xs px-3 h-6">
                    {slug.replace("bm", "BM ")}
                  </TabsTrigger>
                ))}
                {bmAccounts.map((b) => (
                  <TabsTrigger key={b.id} value={b.slug} className="text-xs px-3 h-6">{b.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={countryFilter} onValueChange={(v) => setCountryFilter(v)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Todos</TabsTrigger>
                {countries.map((c) => (
                  <TabsTrigger key={c.id} value={c.code} className="text-xs px-3 h-6">
                    {c.flag} {c.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={nichoFilter} onValueChange={(v) => setNichoFilter(v)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">Todos</TabsTrigger>
                {niches.map((n) => (
                  <TabsTrigger key={n.id} value={n.keyword} className="text-xs px-3 h-6">{n.name}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {isAdmin && (
              <SettingsDialog
                niches={niches}
                countries={countries}
                bmAccounts={bmAccounts}
                onChanged={reloadSettings}
              />
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setHideValues((v) => !v)}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={hideValues ? "Mostrar valores" : "Esconder valores"}
            >
              {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <DateFilter selected={range} onSelect={setRange} customRange={customRange} onCustomRange={setCustomRange} />
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Gerenciar Usuários"
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => navigate("/whatsapp-ai")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-400/50 bg-green-500/10 hover:bg-green-500/15"
              title="Liberty AI — WhatsApp Optimizer"
            >
              <Bot className="h-3.5 w-3.5" />
              Liberty AI
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="glass-card p-4 flex items-center gap-3 animate-fade-in-up badge-danger rounded-xl">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Section: KPIs */}
        <section>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, #a78bfa, #7c3aed)" }} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Visão Geral
              </h2>
            </div>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-8 w-[300px] max-w-full text-xs bg-muted/40">
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value="all" className="text-xs">Todas as campanhas</SelectItem>
                {campaignOptions.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {campaignFilter !== "all" && (
              <button
                onClick={() => setCampaignFilter("all")}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                limpar
              </button>
            )}
          </div>


          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
                <KPICard title="Valor Gasto" value={`R$ ${fmt(kpi.totalSpent)}`} icon={DollarSign} variant="blue"
                  trend={spentTrend.trend} trendUp={spentTrend.trendUp} trendNeutral={spentTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.totalSpent)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <KPICard title="Faturamento" value={`R$ ${fmt(kpi.totalRevenue)}`} icon={Wallet} variant="green"
                  trend={revenueTrend.trend} trendUp={revenueTrend.trendUp} trendNeutral={revenueTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.totalRevenue)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <KPICard title="ROAS" value={`${fmt(kpi.roi)}x`} icon={Percent} variant="purple"
                  trend={roiTrend.trend} trendUp={roiTrend.trendUp} trendNeutral={roiTrend.trendNeutral}
                  previousValue={`${fmt(prevKpi.roi)}x`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <KPICard title="Vendas" value={kpi.totalSales.toLocaleString("pt-BR")} icon={Receipt} variant="cyan"
                  trend={salesTrend.trend} trendUp={salesTrend.trendUp} trendNeutral={salesTrend.trendNeutral}
                  previousValue={prevKpi.totalSales.toLocaleString("pt-BR")} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <KPICard title="Ticket Médio" value={`R$ ${fmt(kpi.averageTicket)}`} icon={TrendingUp} variant="green"
                  trend={ticketTrend.trend} trendUp={ticketTrend.trendUp} trendNeutral={ticketTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.averageTicket)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
                <KPICard title="Leads" value={kpi.totalLeads.toLocaleString("pt-BR")} icon={Users} variant="blue"
                  trend={leadsTrend.trend} trendUp={leadsTrend.trendUp} trendNeutral={leadsTrend.trendNeutral}
                  previousValue={prevKpi.totalLeads.toLocaleString("pt-BR")} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <KPICard title="Custo / Lead" value={`R$ ${fmt(kpi.costPerLead)}`} icon={Target} variant="orange"
                  trend={cplTrend.trend} trendUp={cplTrend.trendUp} trendNeutral={cplTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.costPerLead)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
                <KPICard title="CPA" value={`R$ ${fmt(kpi.cpa)}`} icon={Target} variant="orange"
                  trend={cpaTrend.trend} trendUp={cpaTrend.trendUp} trendNeutral={cpaTrend.trendNeutral}
                  previousValue={`R$ ${fmt(prevKpi.cpa)}`} hidden={hideValues} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <KPICard title="Tx. Conversão" value={`${fmt(kpi.conversionRate)}%`} icon={Activity} variant="cyan"
                  trend={convTrend.trend} trendUp={convTrend.trendUp} trendNeutral={convTrend.trendNeutral}
                  previousValue={`${fmt(prevKpi.conversionRate)}%`} hidden={hideValues} />
              </div>
            </div>
          )}
        </section>

        {/* Section: Chart */}
        {!loading && (
          <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-4 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, #34d399, #059669)" }} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Evolução
              </h2>
            </div>
            <SpendChart data={filteredData} range={range} />
          </section>
        )}

        {/* Section: Table */}
        {!loading && (
          <section className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-4 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, #fcd34d, #d97706)" }} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Detalhamento
              </h2>
            </div>
            <AdsTable ads={deduplicatedAds} salesData={filteredSalesData} prevAds={deduplicatedPrevAds} prevSalesData={filteredPrevSalesData} isAdmin={isAdmin} campaignBudgets={campaignBudgets} bmFilter={bmFilter} currencyRates={currencyRates} />
          </section>
        )}

        {/* Section: Webhook History */}
        <section className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-4 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, #f472b6, #db2777)" }} />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Histórico de Webhooks
            </h2>
          </div>
          <WebhookHistory />
        </section>
      </main>
    </div>
  );
};

export default Index;
