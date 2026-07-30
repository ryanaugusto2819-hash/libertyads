import { useEffect, useState } from "react";
import { Settings, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NicheConfig, CountryConfig, BmAccountConfig } from "@/hooks/useDashboardSettings";

interface SettingsDialogProps {
  niches: NicheConfig[];
  countries: CountryConfig[];
  bmAccounts: BmAccountConfig[];
  onChanged: () => void;
}

const emptyNiche = { name: "", keyword: "" };
const emptyCountry = { name: "", code: "", flag: "", currency_code: "", rate_to_brl: "1" };
const emptyBm = { label: "", slug: "", ad_account_id: "", currency: "BRL", access_token: "" };

const SettingsDialog = ({ niches, countries, bmAccounts, onChanged }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [niche, setNiche] = useState(emptyNiche);
  const [country, setCountry] = useState(emptyCountry);
  const [bm, setBm] = useState(emptyBm);

  useEffect(() => {
    if (!open) {
      setNiche(emptyNiche);
      setCountry(emptyCountry);
      setBm(emptyBm);
    }
  }, [open]);

  const addNiche = async () => {
    const name = niche.name.trim();
    const keyword = niche.keyword.trim().toLowerCase();
    if (!name || !keyword) return toast.error("Preencha nome e sigla");
    setSaving(true);
    const { error } = await supabase.from("niches").insert({
      name,
      keyword,
      sort_order: niches.length + 1,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar nicho: " + error.message);
    toast.success(`Nicho "${name}" criado`);
    setNiche(emptyNiche);
    onChanged();
  };

  const addCountry = async () => {
    const name = country.name.trim();
    const code = country.code.trim().toUpperCase();
    const rate = Number(String(country.rate_to_brl).replace(",", "."));
    if (!name || !code) return toast.error("Preencha nome e sigla");
    if (!Number.isFinite(rate) || rate <= 0) return toast.error("Taxa de câmbio inválida");
    setSaving(true);
    const { error } = await supabase.from("countries").insert({
      name,
      code,
      flag: country.flag.trim(),
      currency_code: (country.currency_code.trim() || "BRL").toUpperCase(),
      rate_to_brl: rate,
      sort_order: countries.length + 1,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar país: " + error.message);
    toast.success(`País "${name}" criado`);
    setCountry(emptyCountry);
    onChanged();
  };

  const addBm = async () => {
    const label = bm.label.trim();
    const slug = (bm.slug.trim() || label).toLowerCase().replace(/[^a-z0-9]/g, "");
    const adAccount = bm.ad_account_id.trim().replace(/^act_/, "");
    const token = bm.access_token.trim();
    if (!label || !slug || !adAccount) return toast.error("Preencha apelido e ID da conta");
    if (!token) return toast.error("Informe o token da Meta");
    setSaving(true);
    const { data: inserted, error } = await supabase.from("bm_accounts").insert({
      label,
      slug,
      ad_account_id: adAccount,
      currency: (bm.currency.trim() || "BRL").toUpperCase(),
      sort_order: bmAccounts.length + 1,
    }).select("id").single();
    if (error || !inserted) {
      setSaving(false);
      return toast.error("Erro ao salvar BM: " + (error?.message || ""));
    }
    const { error: secretError } = await supabase.from("bm_account_secrets").insert({
      bm_account_id: inserted.id,
      access_token: token,
    });
    setSaving(false);
    if (secretError) return toast.error("Erro ao salvar token: " + secretError.message);
    toast.success(`${label} adicionada`);
    setBm(emptyBm);
    onChanged();
  };

  const remove = async (table: "niches" | "countries" | "bm_accounts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error("Erro ao remover: " + error.message);
    toast.success("Removido");
    onChanged();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Configurações (nichos, países e BMs)"
      >
        <Settings className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurações do painel</DialogTitle>
            <DialogDescription>
              Crie ou remova nichos, países e contas de BM sem precisar mexer no código.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="nichos">
            <TabsList className="w-full">
              <TabsTrigger value="nichos" className="flex-1">Nichos</TabsTrigger>
              <TabsTrigger value="paises" className="flex-1">Países</TabsTrigger>
              <TabsTrigger value="bms" className="flex-1">BMs</TabsTrigger>
            </TabsList>

            {/* NICHOS */}
            <TabsContent value="nichos" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do nicho</Label>
                  <Input value={niche.name} onChange={(e) => setNiche({ ...niche, name: e.target.value })} placeholder="Cabelo" maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sigla usada no filtro</Label>
                  <Input value={niche.keyword} onChange={(e) => setNiche({ ...niche, keyword: e.target.value })} placeholder="cabe" maxLength={30} />
                </div>
                <Button onClick={addNiche} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A sigla é procurada no nome da campanha e do anúncio (ex.: "prosta" encontra "(UY-PROSTA) ADS03").
              </p>
              <div className="space-y-2 max-h-56 overflow-auto">
                {niches.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm">{n.name} <span className="text-muted-foreground text-xs">— "{n.keyword}"</span></span>
                    <button onClick={() => remove("niches", n.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* PAÍSES */}
            <TabsContent value="paises" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={country.name} onChange={(e) => setCountry({ ...country, name: e.target.value })} placeholder="Chile" maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sigla</Label>
                  <Input value={country.code} onChange={(e) => setCountry({ ...country, code: e.target.value })} placeholder="CL" maxLength={4} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bandeira</Label>
                  <Input value={country.flag} onChange={(e) => setCountry({ ...country, flag: e.target.value })} placeholder="🇨🇱" maxLength={8} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Moeda</Label>
                  <Input value={country.currency_code} onChange={(e) => setCountry({ ...country, currency_code: e.target.value })} placeholder="CLP" maxLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Por 1 real</Label>
                  <Input value={country.rate_to_brl} onChange={(e) => setCountry({ ...country, rate_to_brl: e.target.value })} placeholder="180" />
                </div>
              </div>
              <Button onClick={addCountry} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar país
              </Button>
              <p className="text-[11px] text-muted-foreground">
                A taxa é quanto vale 1 real na moeda local (ex.: Paraguai = 1176,54). Use 1 para países em real.
                O país com a menor ordem recebe as campanhas sem sigla.
              </p>
              <div className="space-y-2 max-h-56 overflow-auto">
                {countries.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm">
                      {c.flag} {c.name} <span className="text-muted-foreground text-xs">— {c.code} · {c.currency_code} · {c.rate_to_brl}</span>
                    </span>
                    <button onClick={() => remove("countries", c.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* BMs */}
            <TabsContent value="bms" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Apelido</Label>
                  <Input value={bm.label} onChange={(e) => setBm({ ...bm, label: e.target.value })} placeholder="BM 12" maxLength={30} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Identificador</Label>
                  <Input value={bm.slug} onChange={(e) => setBm({ ...bm, slug: e.target.value })} placeholder="bm12" maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ID da conta de anúncios</Label>
                  <Input value={bm.ad_account_id} onChange={(e) => setBm({ ...bm, ad_account_id: e.target.value })} placeholder="1985903638826476" maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Moeda da conta</Label>
                  <Input value={bm.currency} onChange={(e) => setBm({ ...bm, currency: e.target.value })} placeholder="BRL" maxLength={6} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Token de acesso da Meta</Label>
                <Input
                  type="password"
                  value={bm.access_token}
                  onChange={(e) => setBm({ ...bm, access_token: e.target.value })}
                  placeholder="EAAG..."
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground">
                  O token é gravado de forma protegida e só é lido pelas funções do servidor — ele nunca volta para o navegador.
                </p>
              </div>
              <Button onClick={addBm} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar BM
              </Button>
              <div className="space-y-2 max-h-56 overflow-auto">
                {bmAccounts.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm">
                      {b.label} <span className="text-muted-foreground text-xs">— {b.slug} · conta {b.ad_account_id} · {b.currency}</span>
                    </span>
                    <button onClick={() => remove("bm_accounts", b.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {bmAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma BM cadastrada por aqui ainda. As BMs antigas continuam funcionando normalmente.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsDialog;
