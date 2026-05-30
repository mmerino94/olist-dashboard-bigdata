import { useApi } from "../../api/client";
import KpiCard from "../KpiCard";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../../lib/format";

type Kpis = {
  pedidos: number;
  ingreso_total: number;
  ticket_promedio: number;
  pct_puntual: number;
  rating_promedio: number;
  pct_resenas_malas: number;
};

export default function KpiRow() {
  const { data, loading, error } = useApi<Kpis>("/api/resumen/kpis");

  if (error) return <div className="text-bad text-sm font-mono py-4">Error KPIs: {error}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard label="Ingreso total" value={loading ? "…" : fmtCurrencyShort(data?.ingreso_total)} size="sm" />
      <KpiCard label="Pedidos" value={loading ? "…" : fmtNumber(data?.pedidos)} size="sm" />
      <KpiCard label="Ticket prom." value={loading ? "…" : fmtCurrencyShort(data?.ticket_promedio)} size="sm" />
      <KpiCard label="% Puntualidad" value={loading ? "…" : fmtPct(data?.pct_puntual)} tone="good" size="sm" />
      <KpiCard label="Rating" value={loading ? "…" : (data?.rating_promedio?.toFixed(2) ?? "—")} size="sm" />
      <KpiCard label="% Reseñas malas" value={loading ? "…" : fmtPct(data?.pct_resenas_malas)} tone="warn" size="sm" />
    </div>
  );
}
