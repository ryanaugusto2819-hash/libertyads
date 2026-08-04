import { useState } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus, Eye, EyeOff, Pencil, RotateCcw, Check, X, Loader2 } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  previousValue?: string;
  variant?: "blue" | "green" | "orange" | "purple" | "cyan" | "default";
  hidden?: boolean;
  /** Manual editing */
  editable?: boolean;
  rawValue?: number;
  autoValue?: string;
  overridden?: boolean;
  saving?: boolean;
  onSaveValue?: (value: number) => void;
  onRevertValue?: () => void;
}


const variantMap: Record<string, {
  neonCard: string;
  iconBox: string;
  iconColor: string;
  accentColor: string;
  trendUpStyle: string;
  trendDownStyle: string;
  // Legacy compat
  glow: string;
  accentBar: string;
}> = {
  blue: {
    neonCard: "neon-card-cyan",
    iconBox: "icon-box icon-box-cyan",
    iconColor: "text-cyan-400",
    accentColor: "#00e5ff",
    trendUpStyle: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "metric-glow-blue",
    accentBar: "accent-bar-blue",
  },
  green: {
    neonCard: "neon-card-green",
    iconBox: "icon-box icon-box-green",
    iconColor: "text-green-400",
    accentColor: "#00ff88",
    trendUpStyle: "bg-green-500/10 text-green-400 border-green-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "metric-glow-green",
    accentBar: "accent-bar-green",
  },
  orange: {
    neonCard: "neon-card-amber",
    iconBox: "icon-box icon-box-amber",
    iconColor: "text-amber-400",
    accentColor: "#ffaa00",
    trendUpStyle: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "metric-glow-orange",
    accentBar: "accent-bar-amber",
  },
  purple: {
    neonCard: "neon-card-violet",
    iconBox: "icon-box icon-box-violet",
    iconColor: "text-violet-400",
    accentColor: "#8b5cf6",
    trendUpStyle: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "metric-glow-purple",
    accentBar: "accent-bar-purple",
  },
  cyan: {
    neonCard: "neon-card-pink",
    iconBox: "icon-box icon-box-pink",
    iconColor: "text-pink-400",
    accentColor: "#f045c8",
    trendUpStyle: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "metric-glow-cyan",
    accentBar: "accent-bar-cyan",
  },
  default: {
    neonCard: "neon-card-violet",
    iconBox: "icon-box icon-box-violet",
    iconColor: "text-violet-400",
    accentColor: "#8b5cf6",
    trendUpStyle: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    trendDownStyle: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "",
    accentBar: "accent-bar-purple",
  },
};

const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  trendNeutral,
  previousValue,
  variant = "default",
  hidden: globalHidden = false,
  editable = false,
  rawValue,
  autoValue,
  overridden = false,
  saving = false,
  onSaveValue,
  onRevertValue,
}: KPICardProps) => {
  const style = variantMap[variant] ?? variantMap.default;
  const [localHidden, setLocalHidden] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isHidden = globalHidden || localHidden;

  const startEditing = () => {
    setDraft(rawValue != null ? String(Number(rawValue.toFixed(2))) : "");
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(draft.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) return;
    onSaveValue?.(parsed);
    setEditing(false);
  };

  return (
    <div
      className={`void-card relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.022] group cursor-default ${style.neonCard}`}
    >
      {/* Corner accent dot */}
      <div
        className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full opacity-60"
        style={{ background: style.accentColor, boxShadow: `0 0 6px ${style.accentColor}` }}
      />

      {/* Inner left accent wash */}
      <div
        className="absolute inset-y-0 left-0 w-16 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${style.accentColor}08, transparent)` }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
            {title}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setLocalHidden((v) => !v); }}
            className="p-0.5 rounded text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors flex-shrink-0"
          >
            {localHidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
          </button>
          {editable && !editing && !isHidden && (
            <button
              onClick={(e) => { e.stopPropagation(); startEditing(); }}
              className="p-0.5 rounded text-muted-foreground/25 hover:text-muted-foreground/70 transition-colors flex-shrink-0"
              title="Editar manualmente"
            >
              {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Pencil className="h-2.5 w-2.5" />}
            </button>
          )}
          {editable && overridden && !editing && (
            <button
              onClick={(e) => { e.stopPropagation(); onRevertValue?.(); }}
              className="p-0.5 rounded text-amber-400/70 hover:text-amber-400 transition-colors flex-shrink-0"
              title="Reverter para o valor automático"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <div className={style.iconBox}>
          <Icon className={`h-4.5 w-4.5 ${style.iconColor}`} style={{ width: 18, height: 18 }} />
        </div>
      </div>

      {/* Value */}
      {editing ? (
        <div className="mb-3.5 flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full bg-background/60 border border-border/60 rounded-md px-2 py-1 text-sm font-data outline-none focus:border-primary/60"
          />
          <button onClick={commit} className="p-1 rounded-md bg-primary/15 text-primary hover:bg-primary/25" title="Salvar">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 rounded-md bg-muted/40 text-muted-foreground hover:bg-muted/60" title="Cancelar">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <p
          className="font-data font-bold tracking-tight leading-none mb-3.5"
          style={{ fontSize: "1.75rem", color: "hsl(238 40% 96%)" }}
        >
          {isHidden ? (
            <span style={{ letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", fontSize: "1.3rem" }}>
              ••••••
            </span>
          ) : (
            value
          )}
          {overridden && !isHidden && autoValue && (
            <span className="block text-[10px] font-normal text-muted-foreground/60 line-through mt-1">
              auto: {autoValue}
            </span>
          )}
        </p>
      )}


      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${
              trendNeutral
                ? "bg-white/5 text-muted-foreground border-white/10"
                : trendUp
                ? style.trendUpStyle
                : style.trendDownStyle
            }`}
          >
            {trendNeutral ? (
              <Minus className="h-2.5 w-2.5" />
            ) : trendUp ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            <span>{isHidden ? "••••" : trend}</span>
          </div>
          {previousValue && !isHidden && (
            <span className="text-[10px] text-muted-foreground/50 truncate font-data">
              ant: {previousValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
