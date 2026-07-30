import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpendChartProps {
  data: any[];
  range: string;
}

const CYAN = "#00e5ff";
const PINK = "#f045c8";
const GRID = "rgba(255,255,255,0.04)";
const TICK = "rgba(180,180,220,0.45)";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(9,9,24,0.97)",
      border: "1px solid rgba(0,229,255,0.2)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 16px 40px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.08)",
      fontFamily: "'Inter', sans-serif",
      minWidth: 160,
    }}>
      <p style={{ color: "rgba(200,200,240,0.6)", fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: "0.06em" }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: entry.stroke,
            boxShadow: `0 0 6px ${entry.stroke}`,
            flexShrink: 0,
          }} />
          <span style={{ color: "rgba(240,240,255,0.6)", fontSize: 11 }}>
            {entry.dataKey === "spend" ? "Gasto" : "Leads"}
          </span>
          <span style={{
            color: entry.stroke,
            fontSize: 13,
            fontWeight: 700,
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {entry.dataKey === "spend"
              ? `R$ ${Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : Number(entry.value).toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
};

const SpendChart = ({ data, range }: SpendChartProps) => {
  const chartData = (() => {
    const byDate: Record<string, { date: string; spend: number; leads: number }> = {};
    for (const row of data) {
      const d = row.date || row.date_start;
      if (!d) continue;
      if (!byDate[d]) byDate[d] = { date: d, spend: 0, leads: 0 };
      byDate[d].spend += Number(row.spend || 0);
      byDate[d].leads += Number(row.leads || 0);
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const sliced =
    range === "today" ? chartData.slice(-1) : range === "7days" ? chartData.slice(-7) : chartData;

  if (sliced.length === 0) {
    return (
      <div className="void-card p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" fill="none" stroke="#00e5ff" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M3 3v18h18M7 16l4-4 4 4 4-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-muted-foreground/50 text-sm">Sem dados para o período</p>
      </div>
    );
  }

  return (
    <div className="void-card p-6 relative overflow-hidden" style={{ borderLeft: "3px solid #00e5ff", boxShadow: "0 4px 20px -2px rgba(4,4,16,0.8), -2px 0 24px rgba(0,229,255,0.12), inset 8px 0 48px rgba(0,229,255,0.03)" }}>

      {/* Subtle grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6 relative">
        <div>
          <h2 className="text-[15px] font-display font-semibold text-foreground tracking-tight">
            Investimento Diário
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">
            Evolução do gasto e leads no período
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-[3px] w-5 rounded-full" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
            <span className="text-[11px] text-muted-foreground font-medium">Gasto</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-[3px] w-5 rounded-full" style={{ background: PINK, boxShadow: `0 0 6px ${PINK}` }} />
            <span className="text-[11px] text-muted-foreground font-medium">Leads</span>
          </div>
        </div>
      </div>

      <div className="h-[280px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
                <stop offset="75%" stopColor={CYAN} stopOpacity={0.02} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PINK} stopOpacity={0.25} />
                <stop offset="75%" stopColor={PINK} stopOpacity={0.02} />
                <stop offset="100%" stopColor={PINK} stopOpacity={0} />
              </linearGradient>
              <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: TICK, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: TICK, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1, strokeDasharray: "4 3" }} />
            <Area
              type="monotone"
              dataKey="spend"
              stroke={CYAN}
              fill="url(#gradCyan)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: CYAN, style: { filter: `drop-shadow(0 0 6px ${CYAN})` } }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke={PINK}
              fill="url(#gradPink)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: PINK, style: { filter: `drop-shadow(0 0 6px ${PINK})` } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendChart;
