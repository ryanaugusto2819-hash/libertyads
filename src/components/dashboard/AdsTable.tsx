import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, Trash2, Play, TrendingUp, TrendingDown, Minus, Search, ArrowUp, ArrowDown, ArrowUpDown, DollarSign, Check, X, Loader2, History, Pencil, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface SaleEntry {
  date: string;
  creative: string;
  campaign?: string;
  sales: number;
  revenue: number;
  country: string;
  currency?: string;
}

interface AdVideo {
  id: string;
  ad_name: string;
  video_url: string;
  file_name: string | null;
}

type CountryFilter = "all" | "uruguay";

type SortKey = "adName" | "spend" | "cpa" | "cpl" | "leads" | "sales" | "convRate" | "avgTicket" | "hookRate" | "bodyRate" | "ctr" | "cpm" | "revenue" | "roi" | "lucro70" | "lucro60" | "lucro50" | "lucro40";
type SortDir = "asc" | "desc";

interface AdsTableProps {
  ads: any[];
  salesData?: SaleEntry[];
  prevAds?: any[];
  prevSalesData?: SaleEntry[];
  isAdmin?: boolean;
  campaignBudgets?: Record<string, { daily_budget: number; name: string; status: string }>;
  bmFilter?: string;
  currencyRates?: Record<string, number>;
}
const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  return `há ${mo}mes${mo > 1 ? "es" : ""}`;
};

const hasCountryTag = (value: string, tag: "BR" | "UY" | "AR" | "PY") => {
  const normalized = (value || "").toUpperCase();
  return new RegExp(`(^|[^A-Z0-9])${tag}([^A-Z0-9]|$)`).test(normalized);
};

const getAdCountryFlags = (ad: any) => {
  const source = [ad.campaign_name, ad.ad_name, ad.name].filter(Boolean).join(" ");
  return {
    isPY: hasCountryTag(source, "PY") || /PARAGUAI|PARAGUAY/i.test(source),
    isAR: hasCountryTag(source, "AR") || /ARGENTINA/i.test(source),
    isUY: hasCountryTag(source, "UY") || /URUGUAI|URUGUAY/i.test(source),
    isBR: hasCountryTag(source, "BR") || /BRASIL|BRAZIL/i.test(source),
  };
};

interface BudgetHistoryEntry {
  previous_budget: number | null;
  new_budget: number;
  created_at: string;
}

type MetricKey = "sales" | "revenue" | "leads" | "spend";

interface ManualOverride {
  value: number;
  original_value: number | null;
  updated_at: string;
}

const DEFAULT_RATES: Record<string, number> = { UYU: 7.93, ARS: 278.39, PYG: 1176.54 };

const AdsTable = ({ ads, salesData = [], prevAds = [], prevSalesData = [], isAdmin = false, campaignBudgets = {}, bmFilter, currencyRates }: AdsTableProps) => {
  const rates = { ...DEFAULT_RATES, ...(currencyRates || {}) };
  const [adVideos, setAdVideos] = useState<Record<string, AdVideo>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [updatingBudget, setUpdatingBudget] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [budgetHistory, setBudgetHistory] = useState<Record<string, BudgetHistoryEntry>>({});
  const [overrides, setOverrides] = useState<Record<string, ManualOverride>>({});
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [metricValue, setMetricValue] = useState("");
  const [savingMetric, setSavingMetric] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("manual_metric_overrides")
        .select("row_key, metric, value, original_value, updated_at")
        .eq("user_id", user.id);
      if (data) {
        const map: Record<string, ManualOverride> = {};
        for (const row of data as any[]) {
          map[`${row.row_key}|${row.metric}`] = {
            value: Number(row.value),
            original_value: row.original_value == null ? null : Number(row.original_value),
            updated_at: row.updated_at,
          };
        }
        setOverrides(map);
      }
    })();
  }, [user?.id]);

  const saveOverride = async (rowKey: string, metric: MetricKey, raw: string, originalValue: number) => {
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }
    if (!user?.id) return;
    const key = `${rowKey}|${metric}`;
    setSavingMetric(key);
    try {
      const existing = overrides[key];
      const original = existing?.original_value ?? originalValue;
      const { error } = await supabase
        .from("manual_metric_overrides")
        .upsert(
          { user_id: user.id, row_key: rowKey, metric, value, original_value: original },
          { onConflict: "user_id,row_key,metric" },
        );
      if (error) throw error;
      setOverrides((prev) => ({
        ...prev,
        [key]: { value, original_value: original, updated_at: new Date().toISOString() },
      }));
      toast.success("Valor ajustado manualmente — métricas recalculadas");
      setEditingMetric(null);
      setMetricValue("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar ajuste manual");
    } finally {
      setSavingMetric(null);
    }
  };

  const revertOverride = async (rowKey: string, metric: MetricKey) => {
    if (!user?.id) return;
    const key = `${rowKey}|${metric}`;
    setSavingMetric(key);
    try {
      const { error } = await supabase
        .from("manual_metric_overrides")
        .delete()
        .eq("user_id", user.id)
        .eq("row_key", rowKey)
        .eq("metric", metric);
      if (error) throw error;
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Valor original restaurado");
      setEditingMetric(null);
      setMetricValue("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao reverter ajuste");
    } finally {
      setSavingMetric(null);
    }
  };

  useEffect(() => {
    if (!user?.id || !isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("campaign_budget_history")
        .select("campaign_id, previous_budget, new_budget, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) {
        const map: Record<string, BudgetHistoryEntry> = {};
        for (const row of data as any[]) {
          if (!map[row.campaign_id]) {
            map[row.campaign_id] = {
              previous_budget: row.previous_budget,
              new_budget: Number(row.new_budget),
              created_at: row.created_at,
            };
          }
        }
        setBudgetHistory(map);
      }
    })();
  }, [user?.id, isAdmin]);

  const handleBudgetUpdate = async (adName: string, campaignIds: string[], bmAccount?: string, previousBudget?: number | null) => {
    const value = parseFloat(budgetValue.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setUpdatingBudget(adName);
    try {
      for (const campaignId of campaignIds) {
        const { data, error } = await supabase.functions.invoke("updateCampaignBudget", {
          body: { campaign_id: campaignId, daily_budget: value, bm_account: bmAccount || bmFilter },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.details?.message || data.error);
      }
      // Save history per campaign (best-effort)
      if (user?.id) {
        const nowIso = new Date().toISOString();
        const rows = campaignIds.map((cid) => ({
          campaign_id: cid,
          ad_name: adName,
          previous_budget: previousBudget ?? null,
          new_budget: value,
          user_id: user.id,
        }));
        await supabase.from("campaign_budget_history").insert(rows);
        setBudgetHistory((prev) => {
          const next = { ...prev };
          for (const cid of campaignIds) {
            next[cid] = { previous_budget: previousBudget ?? null, new_budget: value, created_at: nowIso };
          }
          return next;
        });
      }
      toast.success(`Orçamento atualizado para R$${value.toFixed(2)}`);
      setEditingBudget(null);
      setBudgetValue("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar orçamento: " + (err.message || "erro desconhecido"));
    } finally {
      setUpdatingBudget(null);
    }
  };

  const handleStatusToggle = async (campaignId: string, currentStatus: string, bmAccount?: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setTogglingStatus(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("updateCampaignStatus", {
        body: { campaign_id: campaignId, status: newStatus, bm_account: bmAccount || bmFilter },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details?.message || data.error);
      setLocalStatuses(prev => ({ ...prev, [campaignId]: newStatus }));
      toast.success(`Campanha ${newStatus === "ACTIVE" ? "ativada" : "pausada"} com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao alterar status: " + (err.message || "erro desconhecido"));
    } finally {
      setTogglingStatus(null);
    }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase.from("ad_videos").select("*");
      if (data) {
        const map: Record<string, AdVideo> = {};
        data.forEach((v: any) => { map[v.ad_name] = v; });
        setAdVideos(map);
      }
    };
    fetchVideos();
  }, []);

  const handleUpload = async (adName: string, file: File) => {
    try {
      setUploading(adName);
      const ext = file.name.split(".").pop();
      const path = `${adName.replace(/\s+/g, "_")}_${Date.now()}.${ext}`;
      const existing = adVideos[adName];
      if (existing) {
        const oldPath = existing.video_url.split("/ad-videos/")[1];
        if (oldPath) await supabase.storage.from("ad-videos").remove([oldPath]);
        await supabase.from("ad_videos").delete().eq("id", existing.id);
      }
      const { error: uploadError } = await supabase.storage.from("ad-videos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("ad-videos").getPublicUrl(path);
      const { data: insertData, error: insertError } = await supabase
        .from("ad_videos")
        .insert({ ad_name: adName, video_url: urlData.publicUrl, file_name: file.name })
        .select()
        .single();
      if (insertError) throw insertError;
      setAdVideos(prev => ({ ...prev, [adName]: insertData as AdVideo }));
      toast.success("Vídeo salvo com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (adName: string) => {
    const existing = adVideos[adName];
    if (!existing) return;
    try {
      const oldPath = existing.video_url.split("/ad-videos/")[1];
      if (oldPath) await supabase.storage.from("ad-videos").remove([oldPath]);
      await supabase.from("ad_videos").delete().eq("id", existing.id);
      setAdVideos(prev => {
        const copy = { ...prev };
        delete copy[adName];
        return copy;
      });
      toast.success("Vídeo removido");
    } catch {
      toast.error("Erro ao remover vídeo");
    }
  };

  // Build rows data
  const allAdNames = ads.map(a => (a.ad_name || a.name || "").toLowerCase().trim()).filter(Boolean);

  // Normalize: lowercase, remove punctuation, collapse whitespace
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const extractCampaignKey = (value: string) => norm(value).match(/(?:^|\s)(uy|ar|br)\s+([a-z]+)\s+ads\s*0*(\d+)\s+api\s*0*(\d+)(?:\s|$)/)?.slice(1).join("|") || "";

  // Match sales by CAMPAIGN NAME only (ignore creative/ad name)
  const matchSale = (s: any, _adNameNorm: string, adCampaignNorm: string, adName: string) => {
    if (!adName || !adCampaignNorm) return { match: false, byCreative: false };
    const campFull = norm(s.campaign || "");
    const adCamp = norm(adCampaignNorm);
    if (!campFull || !adCamp) return { match: false, byCreative: false };
    const saleKey = extractCampaignKey(s.campaign || "");
    const adKey = extractCampaignKey(adCampaignNorm || "");
    if (saleKey && adKey && saleKey === adKey) return { match: true, byCreative: false };
    if (adCamp === campFull) return { match: true, byCreative: false };
    if (campFull.length > 5 && (adCamp.includes(campFull) || campFull.includes(adCamp))) return { match: true, byCreative: false };
    return { match: false, byCreative: false };
  };

  // Pre-count: for each sale, how many ads match it at campaign-only level (no creative match)
  const saleCampaignAdCount = new Map<any, number>();
  salesData.forEach((s) => {
    let creativeHit = 0;
    let campaignHit = 0;
    ads.forEach((ad) => {
      const adName = ad.ad_name || ad.name || "";
      const r = matchSale(s, adName.toLowerCase().trim(), (ad.campaign_name || "").toLowerCase().trim(), adName);
      if (r.match && r.byCreative) creativeHit++;
      else if (r.match) campaignHit++;
    });
    // If any creative-level match exists, campaign-only matches are ignored entirely
    saleCampaignAdCount.set(s, creativeHit > 0 ? 0 : campaignHit);
  });

  const convertRev = (s: any) => {
    const raw = Number(s.revenue || 0);
    const currency = (s.currency || "").toUpperCase();
    const rate = Number(rates[currency] || 0);
    return rate > 0 ? raw / rate : raw;
  };


  const rows = ads.map((ad) => {
    const adName = ad.ad_name || ad.name || "";
    const adNameNorm = adName.toLowerCase().trim();
    const adCampaignNorm = (ad.campaign_name || "").toLowerCase().trim();
    let sales = 0;
    let revenue = 0;
    salesData.forEach((s) => {
      const r = matchSale(s, adNameNorm, adCampaignNorm, adName);
      if (!r.match) return;
      if (r.byCreative) {
        sales += Number(s.sales || 0);
        revenue += convertRev(s);
      } else {
        // Distribute campaign-only sale across all ads in the campaign
        const denom = saleCampaignAdCount.get(s) || 0;
        if (denom > 0) {
          sales += Number(s.sales || 0) / denom;
          revenue += convertRev(s) / denom;
        }
      }
    });
    const rowKey = adCampaignNorm || adNameNorm;
    const ov = (metric: MetricKey, auto: number) => {
      const o = overrides[`${rowKey}|${metric}`];
      return o ? o.value : auto;
    };
    const autoSales = sales;
    const autoRevenue = revenue;
    const autoSpend = ad.spend ?? ad.spent ?? 0;
    const autoLeads = ad.leads ?? 0;
    sales = ov("sales", autoSales);
    revenue = ov("revenue", autoRevenue);
    const spend = ov("spend", autoSpend);
    const leads = ov("leads", autoLeads);
    const autos = { sales: autoSales, revenue: autoRevenue, spend: autoSpend, leads: autoLeads };
    const cpl = leads > 0 ? spend / leads : 0;
    const cpa = sales > 0 ? spend / sales : 0;
    const convRate = leads > 0 ? (sales / leads) * 100 : 0;
    const avgTicket = sales > 0 ? revenue / sales : 0;
    const roi = spend > 0 ? revenue / spend : 0;
    const lucro70 = revenue * 0.7 - spend;
    const lucro60 = revenue * 0.6 - spend;
    const lucro50 = revenue * 0.5 - spend;
    const lucro40 = revenue * 0.4 - spend;

    const campaignName = (ad.campaign_name || "").toLowerCase().trim();
    return { ad, adName, rowKey, autos, campaignName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 };
  });

  // Build previous period rows map for comparison
  const prevAllAdNames = prevAds.map(a => (a.ad_name || a.name || "").toLowerCase().trim()).filter(Boolean);
  const prevAllCampaignNames = prevAds.map(a => (a.campaign_name || "").toLowerCase().trim()).filter(Boolean);
  const prevRowsMap = useMemo(() => {
    const map = new Map<string, typeof rows[0]>();
    prevAds.forEach((ad) => {
      const adName = ad.ad_name || ad.name || "";
      const adNameNorm = adName.toLowerCase().trim();
      const adCampaignNorm = (ad.campaign_name || "").toLowerCase().trim();
      const matchedSales = prevSalesData.filter(s => {
        if (!adName) return false;
        const cFull = (s.creative || "").toLowerCase().trim();
        const campFull = (s.campaign || "").toLowerCase().trim();
        if (cFull && adNameNorm === cFull) return true;
        if (campFull && adCampaignNorm && adCampaignNorm === campFull) return true;
        if (campFull && adCampaignNorm && campFull.length > 5 && (adCampaignNorm.includes(campFull) || campFull.includes(adCampaignNorm))) return true;
        if (cFull && adCampaignNorm && cFull.length > 5 && (adCampaignNorm.includes(cFull) || cFull.includes(adCampaignNorm))) return true;
        if (cFull) {
          const cStripped = cFull.replace(/ ar$/, "");
          if (cStripped !== cFull && !prevAllAdNames.includes(cFull) && adNameNorm === cStripped) return true;
        }
        return false;
      });
      const spend = ad.spend ?? ad.spent ?? 0;
      const leads = ad.leads ?? 0;
      const sales = matchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
      const revenue = matchedSales.reduce((sum, s) => sum + convertRev(s), 0);

      const cpl = ad.costPerLead ?? ad.cpl ?? (leads > 0 ? spend / leads : 0);
      const cpa = ad.cpa ?? (sales > 0 ? spend / sales : 0);
      const convRate = leads > 0 ? (sales / leads) * 100 : 0;
      const avgTicket = sales > 0 ? revenue / sales : 0;
      const roi = spend > 0 ? revenue / spend : 0;
      const lucro70 = revenue * 0.7 - spend;
      const lucro60 = revenue * 0.6 - spend;
      const lucro50 = revenue * 0.5 - spend;
      const lucro40 = revenue * 0.4 - spend;
      const campaignName = adCampaignNorm;
      const prevCampaignName = adCampaignNorm;
      const mapKey = adCampaignNorm || adNameNorm;
      map.set(mapKey, { ad, adName, rowKey: mapKey, autos: { sales, revenue, spend, leads }, campaignName: prevCampaignName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 });
    });
    return map;
  }, [prevAds, prevSalesData, prevAllAdNames]);

  const allCampaignNames = ads.map(a => (a.campaign_name || "").toLowerCase().trim()).filter(Boolean);
  const unmatchedSales = salesData.filter(s => {
    const cFull = (s.creative || "").toLowerCase().trim();
    const campFull = (s.campaign || "").toLowerCase().trim();
    if (!cFull && !campFull) return true;
    if (cFull === "sem criativo" || cFull === "não identificado" || cFull === "sem crtiativo" || cFull === "criativo não identificado") return true;
    if (cFull && allAdNames.includes(cFull)) return false;
    if (campFull && allCampaignNames.includes(campFull)) return false;
    const saleKey = extractCampaignKey(s.campaign || "");
    if (saleKey && allCampaignNames.some(cn => extractCampaignKey(cn) === saleKey)) return false;
    // Fuzzy match: check if any campaign/ad contains or is contained by the sale's names
    if (campFull && campFull.length > 5 && allCampaignNames.some(cn => cn.includes(campFull) || campFull.includes(cn))) return false;
    if (cFull && cFull.length > 5 && allCampaignNames.some(cn => cn.includes(cFull) || cFull.includes(cn))) return false;
    if (cFull) {
      const cStripped = cFull.replace(/ ar$/, "");
      if (cStripped !== cFull && !allAdNames.includes(cFull) && allAdNames.includes(cStripped)) return false;
    }
    return true;
  });
  const uSales = unmatchedSales.reduce((sum, s) => sum + Number(s.sales || 0), 0);
  const uRevenue = unmatchedSales.reduce((sum, s) => sum + convertRev(s), 0);

  const unmatchedGroups = Array.from(unmatchedSales.reduce((map, s) => {
    const key = (s.campaign || s.creative || "Sem campanha").trim() || "Sem campanha";
    const current = map.get(key) || { label: key, sales: 0, revenue: 0 };
    current.sales += Number(s.sales || 0);
    current.revenue += convertRev(s);
    map.set(key, current);
    return map;
  }, new Map<string, { label: string; sales: number; revenue: number }>()).values());

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const getRowStatus = useCallback((ad: any) => {
    const campaignIds: string[] = ad.campaignIds || (ad.campaign_id ? [ad.campaign_id] : []);
    const statuses = campaignIds.map(cid => localStatuses[cid] || campaignBudgets[cid]?.status || "").filter(Boolean);
    return statuses.includes("ACTIVE") ? "ACTIVE" : (statuses[0] || ad.status?.toUpperCase() || "");
  }, [localStatuses, campaignBudgets]);

  const filteredRows = useMemo(() => {
    let result = rows.filter(r => r.spend > 0);
    if (countryFilter !== "all") {
      result = result.filter(r => {
        const { isAR, isBR, isUY } = getAdCountryFlags(r.ad);
        return isUY || (!isAR && !isBR);
      });
    }
    if (statusFilter !== "all") {
      result = result.filter(r => {
        const st = getRowStatus(r.ad);
        return statusFilter === "active" ? st === "ACTIVE" : st !== "ACTIVE";
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => r.adName.toLowerCase().includes(q) || (r.campaignName && r.campaignName.toLowerCase().includes(q)));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        if (sortKey === "adName") {
          aVal = a.adName.toLowerCase();
          bVal = b.adName.toLowerCase();
        } else if (sortKey === "hookRate" || sortKey === "bodyRate" || sortKey === "ctr" || sortKey === "cpm") {
          aVal = a.ad[sortKey] ?? 0;
          bVal = b.ad[sortKey] ?? 0;
        } else {
          aVal = (a as any)[sortKey] ?? 0;
          bVal = (b as any)[sortKey] ?? 0;
        }
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, searchQuery, countryFilter, statusFilter, getRowStatus, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1 inline" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-primary ml-1 inline" />
      : <ArrowUp className="h-3 w-3 text-primary ml-1 inline" />;
  };

  const thBase = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors";

  const RoiIndicator = ({ value }: { value: number }) => {
    if (value > 1.5) return <TrendingUp className="h-3.5 w-3.5 text-profit inline ml-1" />;
    if (value < 1) return <TrendingDown className="h-3.5 w-3.5 text-loss inline ml-1" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />;
  };

  const ProfitCell = ({ value }: { value: number }) => (
    <span className={`font-medium ${value > 0 ? "text-profit" : "text-loss"}`}>
      R${fmt(value)}
    </span>
  );

  // Comparison cell: shows current value + prev value below in smaller text
  const MetricCell = ({ current, prev, prefix = "", suffix = "", invert = false, className = "" }: {
    current: number; prev?: number; prefix?: string; suffix?: string; invert?: boolean; className?: string;
  }) => {
    const hasPrev = prev != null && prev !== 0;
    return (
      <div className={className}>
        <div>{prefix}{fmt(current)}{suffix}</div>
        {hasPrev && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            {prefix}{fmt(prev)}{suffix}
          </div>
        )}
      </div>
    );
  };

  const ProfitCompareCell = ({ current, prev }: { current: number; prev?: number }) => {
    const hasPrev = prev != null && prev !== 0;
    return (
      <div>
        <span className={`font-medium ${current > 0 ? "text-profit" : "text-loss"}`}>R${fmt(current)}</span>
        {hasPrev && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            <span className={prev > 0 ? "text-profit/50" : "text-loss/50"}>R${fmt(prev)}</span>
          </div>
        )}
      </div>
    );
  };

  if ((!ads || ads.length === 0) && salesData.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground text-sm">
        Nenhum anúncio encontrado no período selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-semibold">Métricas por Campanha</h2>
            <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">Performance individual de cada criativo</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Country filter */}
            <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/30">
              {([
                { value: "all" as CountryFilter, label: "Todos" },
                { value: "uruguay" as CountryFilter, label: "🇺🇾" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCountryFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    countryFilter === opt.value
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/30">
              {([
                { value: "all" as const, label: "Todos" },
                { value: "active" as const, label: "Ativos" },
                { value: "paused" as const, label: "Pausados" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === opt.value
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 border-border/30 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Column group headers */}
            <thead>
              <tr className="border-b border-border/10">
                <th className="bg-secondary/10" />
                <th className="bg-secondary/10" />
                <th className="bg-secondary/10" />
                <th colSpan={3} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-primary/70 py-2 bg-primary/[0.03] border-x border-border/10">
                  💰 Custos
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-info/70 py-2 bg-info/[0.03] border-r border-border/10">
                  📊 Conversão
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-warning/70 py-2 bg-warning/[0.03] border-r border-border/10">
                  🎯 Engajamento
                </th>
                <th colSpan={2} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-success/70 py-2 bg-success/[0.03] border-r border-border/10">
                  📈 Receita
                </th>
                <th colSpan={4} className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-[hsl(280,65%,60%)]/70 py-2 bg-[hsl(280,65%,60%)]/[0.03] border-r border-border/10">
                  💎 Lucro Estimado
                </th>
                <th className="bg-secondary/10" />
              </tr>
              <tr className="border-b border-border/20 bg-secondary/20">
                <th onClick={() => toggleSort("adName")} className={`text-left ${thBase} min-w-[180px] sticky left-0 bg-secondary/20 z-10`}>Campanha <SortIcon col="adName" /></th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Status</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Orçamento</th>
                {/* Custos */}
                <th onClick={() => toggleSort("spend")} className={`text-right ${thBase} bg-primary/[0.02]`}>Gasto <SortIcon col="spend" /></th>
                <th onClick={() => toggleSort("cpa")} className={`text-right ${thBase} bg-primary/[0.02]`}>CPA <SortIcon col="cpa" /></th>
                <th onClick={() => toggleSort("cpl")} className={`text-right ${thBase} bg-primary/[0.02] border-r border-border/10`}>CPL <SortIcon col="cpl" /></th>
                {/* Conversão */}
                <th onClick={() => toggleSort("leads")} className={`text-right ${thBase} bg-info/[0.02]`}>Leads <SortIcon col="leads" /></th>
                <th onClick={() => toggleSort("sales")} className={`text-right ${thBase} bg-info/[0.02]`}>Vendas <SortIcon col="sales" /></th>
                <th onClick={() => toggleSort("convRate")} className={`text-right ${thBase} bg-info/[0.02]`}>Tx Conv. <SortIcon col="convRate" /></th>
                <th onClick={() => toggleSort("avgTicket")} className={`text-right ${thBase} bg-info/[0.02] border-r border-border/10`}>Ticket <SortIcon col="avgTicket" /></th>
                {/* Engajamento */}
                <th onClick={() => toggleSort("hookRate")} className={`text-right ${thBase} bg-warning/[0.02]`}>Hook <SortIcon col="hookRate" /></th>
                <th onClick={() => toggleSort("bodyRate")} className={`text-right ${thBase} bg-warning/[0.02]`}>Body <SortIcon col="bodyRate" /></th>
                <th onClick={() => toggleSort("ctr")} className={`text-right ${thBase} bg-warning/[0.02]`}>CTR <SortIcon col="ctr" /></th>
                <th onClick={() => toggleSort("cpm")} className={`text-right ${thBase} bg-warning/[0.02] border-r border-border/10`}>CPM <SortIcon col="cpm" /></th>
                {/* Receita */}
                <th onClick={() => toggleSort("revenue")} className={`text-right ${thBase} bg-success/[0.02]`}>Faturamento <SortIcon col="revenue" /></th>
                <th onClick={() => toggleSort("roi")} className={`text-right ${thBase} bg-success/[0.02] border-r border-border/10`}>ROAS <SortIcon col="roi" /></th>
                {/* Lucro */}
                <th onClick={() => toggleSort("lucro70")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>70% <SortIcon col="lucro70" /></th>
                <th onClick={() => toggleSort("lucro60")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>60% <SortIcon col="lucro60" /></th>
                <th onClick={() => toggleSort("lucro50")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02]`}>50% <SortIcon col="lucro50" /></th>
                <th onClick={() => toggleSort("lucro40")} className={`text-right ${thBase} bg-[hsl(280,65%,60%)]/[0.02] border-r border-border/10`}>40% <SortIcon col="lucro40" /></th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-3">Vídeo</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => {
                const { ad, adName, spend, leads, sales, revenue, cpl, cpa, convRate, avgTicket, roi, lucro70, lucro60, lucro50, lucro40 } = row;
                const video = adVideos[adName];
                const campaignIds: string[] = ad.campaignIds || (ad.campaign_id ? [ad.campaign_id] : []);
                // Get campaign status from budgets data (real Meta status)
                const campaignStatuses = campaignIds.map(cid => localStatuses[cid] || campaignBudgets[cid]?.status || "").filter(Boolean);
                const campaignStatus = campaignStatuses.includes("ACTIVE") ? "ACTIVE" : (campaignStatuses[0] || ad.status?.toUpperCase() || "");
                const isActive = campaignStatus === "ACTIVE";
                const prevKey = (ad.campaign_name || "").toLowerCase().trim() || adName.toLowerCase().trim();
                const prev = prevRowsMap.get(prevKey);

                const tc = "text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap";

                return (
                  <tr
                    key={ad.ad_id || ad.id || i}
                    className="border-b border-border/[0.06] hover:bg-accent/40 transition-colors group"
                  >
                    {/* Name - sticky */}
                    <td className="px-4 py-3.5 font-medium text-sm whitespace-nowrap sticky left-0 bg-background/80 backdrop-blur-sm z-10 group-hover:bg-accent/40 transition-colors">
                      {(() => {
                        const lastEdit = campaignIds
                          .map((cid) => budgetHistory[cid])
                          .filter((e): e is BudgetHistoryEntry => !!e)
                          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-profit' : 'bg-muted-foreground/40'}`} />
                              <span className="truncate max-w-[160px]" title={ad.campaign_name || adName}>{ad.campaign_name || adName || "—"}</span>
                            </div>
                            {lastEdit && (
                              <div
                                className="flex items-center gap-1 pl-3.5 text-[10px] text-muted-foreground/70"
                                title={`Você alterou para R$${fmt(lastEdit.new_budget)} em ${new Date(lastEdit.created_at).toLocaleString("pt-BR")}`}
                              >
                                <History className="h-2.5 w-2.5" />
                                <span>Editado {timeAgo(lastEdit.created_at)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Status with toggle */}
                    <td className="px-2 py-3.5 text-center">
                      {isAdmin && campaignIds.length > 0 ? (
                        <button
                          onClick={() => handleStatusToggle(campaignIds[0], campaignStatus, ad.bm_account)}
                          disabled={togglingStatus === campaignIds[0]}
                          className="group/btn inline-flex items-center gap-1.5 transition-all"
                          title={isActive ? "Clique para pausar" : "Clique para ativar"}
                        >
                          {togglingStatus === campaignIds[0] ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : (
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              className={`text-[10px] px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity ${isActive ? "bg-profit/15 text-profit border-profit/20 border" : "bg-loss/15 text-loss border-loss/20 border"}`}
                            >
                              {isActive ? "Ativo" : "Pausado"}
                            </Badge>
                          )}
                        </button>
                      ) : (
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={`text-[10px] px-2 py-0.5 ${isActive ? "bg-profit/15 text-profit border-profit/20 border" : "bg-muted/60 text-muted-foreground border-0"}`}
                        >
                          {isActive ? "Ativo" : campaignStatus === "PAUSED" ? "Pausado" : "—"}
                        </Badge>
                      )}
                    </td>
                    {/* Orçamento */}
                    <td className="px-2 py-3.5 text-center">
                      {(() => {
                        const cIds: string[] = ad.campaignIds || (ad.campaign_id ? [ad.campaign_id] : []);
                        const budgetValues = cIds
                          .map((cid: string) => campaignBudgets[cid]?.daily_budget)
                          .filter((b: number | undefined): b is number => b != null && b > 0);
                        const currentBudget = budgetValues.length > 0 ? Math.max(...budgetValues) : null;
                        const budgetKey = ad.campaign_id || ad.campaign_name || adName;
                        const lastEdit = cIds
                          .map((cid) => budgetHistory[cid])
                          .filter((e): e is BudgetHistoryEntry => !!e)
                          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];

                        if (!isAdmin || cIds.length === 0) {
                          return <span className="text-muted-foreground text-xs">—</span>;
                        }

                        return (
                          <Popover open={editingBudget === budgetKey} onOpenChange={(open) => {
                            if (open) {
                              setEditingBudget(budgetKey);
                              setBudgetValue(currentBudget ? currentBudget.toString() : "");
                            } else {
                              setEditingBudget(null);
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <button
                                className="flex flex-col items-center gap-0.5 text-xs hover:text-primary transition-colors cursor-pointer group/budget"
                                title="Clique para editar orçamento diário"
                              >
                                {currentBudget != null ? (
                                  <>
                                    <span className="font-medium tabular-nums text-foreground group-hover/budget:text-primary">
                                      R${fmt(currentBudget)}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60">diário</span>
                                    {lastEdit && lastEdit.previous_budget != null && (
                                      <span className="text-[9px] text-muted-foreground/60 line-through" title="Valor anterior">
                                        antes R${fmt(lastEdit.previous_budget)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" align="center" onOpenAutoFocus={(e) => e.preventDefault()}>
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Orçamento Diário (R$)</p>
                                {currentBudget != null && (
                                  <p className="text-[10px] text-muted-foreground/70">Atual: R${fmt(currentBudget)}</p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={budgetValue}
                                    onChange={(e) => setBudgetValue(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleBudgetUpdate(budgetKey, cIds, ad.bm_account, currentBudget);
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                    disabled={updatingBudget === budgetKey || !budgetValue}
                                    onClick={() => handleBudgetUpdate(budgetKey, cIds, ad.bm_account, currentBudget)}
                                  >
                                    {updatingBudget === budgetKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                                {cIds.length > 1 && (
                                  <p className="text-[10px] text-muted-foreground">Será aplicado a {cIds.length} campanhas</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })()}
                    </td>
                    {/* Custos */}
                    <td className={`${tc} bg-primary/[0.01] font-medium`}><MetricCell current={spend} prev={prev?.spend} prefix="R$" /></td>
                    <td className={`${tc} bg-primary/[0.01]`}>
                      <div>
                        <span className={cpa >= 5 && cpa <= 100 ? "text-profit" : cpa > 100 && cpa <= 200 ? "text-warning" : "text-loss"}>
                          R${fmt(cpa)}
                        </span>
                        {prev && prev.cpa > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">R${fmt(prev.cpa)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-primary/[0.01] border-r border-border/[0.06]`}><MetricCell current={cpl} prev={prev?.cpl} prefix="R$" /></td>
                    {/* Conversão */}
                    <td className={`${tc} bg-info/[0.01]`}>
                      <div>
                        <div>{Math.round(leads)}</div>
                        {prev && prev.leads > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{Math.round(prev.leads)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01]`}>
                      <div>
                        <div>{Math.round(sales)}</div>
                        {prev && prev.sales > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{Math.round(prev.sales)}</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01]`}>

                      <div>
                        <span className={convRate >= 10 ? "text-profit" : convRate >= 5 ? "text-warning" : "text-muted-foreground"}>
                          {fmt(convRate)}%
                        </span>
                        {prev && prev.convRate > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.convRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-info/[0.01] border-r border-border/[0.06]`}><MetricCell current={avgTicket} prev={prev?.avgTicket} prefix="R$" /></td>
                    {/* Engajamento */}
                    <td className={`${tc} bg-warning/[0.01]`}>
                      <div>
                        <span className={(ad.hookRate ?? 0) >= 60 ? "text-profit" : (ad.hookRate ?? 0) >= 50 ? "text-warning" : "text-loss"}>
                          {fmt(ad.hookRate)}%
                        </span>
                        {prev && (prev.ad.hookRate ?? 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.ad.hookRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-warning/[0.01]`}>
                      <div>
                        <span className={(ad.bodyRate ?? 0) >= 3.5 ? "text-profit" : (ad.bodyRate ?? 0) >= 2 ? "text-warning" : "text-loss"}>
                          {fmt(ad.bodyRate)}%
                        </span>
                        {prev && (prev.ad.bodyRate ?? 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.ad.bodyRate)}%</div>
                        )}
                      </div>
                    </td>
                    <td className={`${tc} bg-warning/[0.01]`}><MetricCell current={ad.ctr ?? 0} prev={prev?.ad.ctr} suffix="%" /></td>
                    <td className={`${tc} bg-warning/[0.01] border-r border-border/[0.06]`}><MetricCell current={ad.cpm ?? 0} prev={prev?.ad.cpm} prefix="R$" /></td>
                    {/* Receita */}
                    <td className={`${tc} bg-success/[0.01] font-semibold`}><MetricCell current={revenue} prev={prev?.revenue} prefix="R$" /></td>
                    <td className={`${tc} bg-success/[0.01] border-r border-border/[0.06]`}>
                      <div>
                        <span className={`font-semibold ${roi >= 1 ? "text-profit" : "text-loss"}`}>
                          {fmt(roi)}x
                        </span>
                        <RoiIndicator value={roi} />
                        {prev && prev.roi !== 0 && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{fmt(prev.roi)}x</div>
                        )}
                      </div>
                    </td>
                    {/* Lucro */}
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro70} prev={prev?.lucro70} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro60} prev={prev?.lucro60} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCompareCell current={lucro50} prev={prev?.lucro50} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${tc} bg-[hsl(280,65%,60%)]/[0.01] border-r border-border/[0.06]`}>{isAdmin ? <ProfitCompareCell current={lucro40} prev={prev?.lucro40} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    {/* Video */}
                    <td className="px-2 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          ref={el => { fileInputRefs.current[adName] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(adName, file);
                            e.target.value = "";
                          }}
                        />
                        {video ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10" onClick={() => setPreviewVideo(video.video_url)} title="Assistir vídeo">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-loss hover:bg-loss/10" onClick={() => handleDelete(adName)} title="Remover vídeo">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => fileInputRefs.current[adName]?.click()} disabled={uploading === adName} title="Enviar vídeo">
                            {uploading === adName ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Video className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Unmatched sales */}
              {unmatchedGroups.map((group) => (
                <tr key={group.label} className="border-t border-border/20 bg-muted/20">
                  <td className="px-4 py-3.5 font-medium text-sm whitespace-nowrap italic text-muted-foreground sticky left-0 bg-muted/20 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                      <span className="truncate max-w-[220px]" title={group.label}>{group.label}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-center"><Badge variant="secondary" className="bg-muted/60 text-muted-foreground border-0 text-[10px]">—</Badge></td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 font-medium">{group.sales.toLocaleString("pt-BR")}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 border-r border-border/[0.06]">R${fmt(group.sales > 0 ? group.revenue / group.sales : 0)}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 font-semibold">R${fmt(group.revenue)}</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground">—</td>
                  <td className="text-right text-sm tabular-nums px-3 py-3.5 text-muted-foreground border-r border-border/[0.06]">—</td>
                  <td className="px-2 py-3.5" />
                </tr>
              ))}

              {/* TOTAL row */}
              {(() => {
                const tSpend = filteredRows.reduce((s, r) => s + r.spend, 0);
                const tLeads = filteredRows.reduce((s, r) => s + r.leads, 0);
                const tSales = filteredRows.reduce((s, r) => s + r.sales, 0) + uSales;
                const tRevenue = filteredRows.reduce((s, r) => s + r.revenue, 0) + uRevenue;
                const tCpa = tSales > 0 ? tSpend / tSales : 0;
                const tCpl = tLeads > 0 ? tSpend / tLeads : 0;
                const tConvRate = tLeads > 0 ? (tSales / tLeads) * 100 : 0;
                const tAvgTicket = tSales > 0 ? tRevenue / tSales : 0;
                const tRoas = tSpend > 0 ? tRevenue / tSpend : 0;
                const tLucro70 = tRevenue * 0.7 - tSpend;
                const tLucro60 = tRevenue * 0.6 - tSpend;
                const tLucro50 = tRevenue * 0.5 - tSpend;
                const tLucro40 = tRevenue * 0.4 - tSpend;
                const tImpressions = filteredRows.reduce((s, r) => s + (r.ad.impressions || 0), 0);
                const tClicks = filteredRows.reduce((s, r) => s + (r.ad.clicks || 0), 0);
                const tCtr = tImpressions > 0 ? (tClicks / tImpressions) * 100 : 0;
                const tCpm = tImpressions > 0 ? (tSpend / tImpressions) * 1000 : 0;
                const tHookWeighted = filteredRows.reduce((s, r) => s + (r.ad.hookRate || 0) * (r.ad.impressions || 0), 0);
                const tBodyWeighted = filteredRows.reduce((s, r) => s + (r.ad.bodyRate || 0) * (r.ad.impressions || 0), 0);
                const tHookRate = tImpressions > 0 ? tHookWeighted / tImpressions : 0;
                const tBodyRate = tImpressions > 0 ? tBodyWeighted / tImpressions : 0;

                const ttc = "text-right text-sm tabular-nums px-3 py-3.5 whitespace-nowrap font-semibold";

                return (
                  <tr className="border-t-2 border-primary/30 bg-primary/[0.05]">
                    <td className="px-4 py-3.5 font-bold text-sm whitespace-nowrap sticky left-0 bg-primary/[0.05] z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                        TOTAL
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-center"><Badge className="bg-primary/15 text-primary border-primary/20 border text-[10px] px-2 py-0.5">{filteredRows.length}</Badge></td>
                    <td className="px-2 py-3.5 text-center text-muted-foreground text-xs">—</td>
                    <td className={`${ttc} bg-primary/[0.02]`}>R${fmt(tSpend)}</td>
                    <td className={`${ttc} bg-primary/[0.02]`}>R${fmt(tCpa)}</td>
                    <td className={`${ttc} bg-primary/[0.02] border-r border-border/[0.06]`}>R${fmt(tCpl)}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>{tLeads.toLocaleString("pt-BR")}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>{tSales.toLocaleString("pt-BR")}</td>
                    <td className={`${ttc} bg-info/[0.02]`}>
                      <span className={tConvRate >= 10 ? "text-profit" : tConvRate >= 5 ? "text-warning" : "text-muted-foreground"}>{fmt(tConvRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-info/[0.02] border-r border-border/[0.06]`}>R${fmt(tAvgTicket)}</td>
                    <td className={`${ttc} bg-warning/[0.02]`}>
                      <span className={tHookRate >= 60 ? "text-profit" : tHookRate >= 50 ? "text-warning" : "text-loss"}>{fmt(tHookRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-warning/[0.02]`}>
                      <span className={tBodyRate >= 3.5 ? "text-profit" : tBodyRate >= 2 ? "text-warning" : "text-loss"}>{fmt(tBodyRate)}%</span>
                    </td>
                    <td className={`${ttc} bg-warning/[0.02]`}>{fmt(tCtr)}%</td>
                    <td className={`${ttc} bg-warning/[0.02] border-r border-border/[0.06]`}>R${fmt(tCpm)}</td>
                    <td className={`${ttc} bg-success/[0.02]`}>R${fmt(tRevenue)}</td>
                    <td className={`${ttc} bg-success/[0.02] border-r border-border/[0.06]`}>
                      <span className={`${tRoas >= 1 ? "text-profit" : "text-loss"}`}>{fmt(tRoas)}x</span>
                      <RoiIndicator value={tRoas} />
                    </td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro70} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro60} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01]`}>{isAdmin ? <ProfitCell value={tLucro50} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className={`${ttc} bg-[hsl(280,65%,60%)]/[0.01] border-r border-border/[0.06]`}>{isAdmin ? <ProfitCell value={tLucro40} /> : <span className="text-muted-foreground">••••••</span>}</td>
                    <td className="px-2 py-3.5" />
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display">Vídeo do Criativo</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <video src={previewVideo} controls autoPlay className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdsTable;
