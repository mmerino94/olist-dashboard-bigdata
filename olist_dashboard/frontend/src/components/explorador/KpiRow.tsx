// Cockpit de KPIs ejecutivos — un vital por problema (P1-P5) + volumen.
// Cada tarjeta: valor del periodo + comparación (Δ YoY/MoM) + contexto.
// Datos: todos de endpoints existentes (reactivos a los filtros globales).
import { useApi } from "../../api/client";
import KpiStat from "./KpiStat";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../../lib/format";

type Evo = { anio: number; mes: number; pedidos: number; ingreso: number; rating: number; periodo: string };
type Recompra = { clientes_unicos: number; una_compra: number; recurrentes: number; tasa_recompra_pct: number; clv_aprox: number };
type P3Kpis = { pedidos: number; tiempo_promedio: number; pct_puntual: number; retraso_avg_atrasados: number; pct_retraso_critico: number };
type Region = { region: string; pedidos: number; retraso_avg: number; pct_puntual: number };
type Semaforo = { clasificacion: string; vendedores: number; ingreso: number; pct_vendedores: number; pct_ingreso: number };
type Dist = { distribucion: { score: number; pct: number }[]; nps_estimado: number; total_resenas: number };

const pctChange = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

export default function KpiRow() {
  const evo = useApi<Evo[]>("/api/resumen/evolucion");
  const rec = useApi<Recompra>("/api/p2/recompra");
  const p3 = useApi<P3Kpis>("/api/p3/kpis");
  const reg = useApi<Region[]>("/api/p3/regiones");
  const sem = useApi<Semaforo[]>("/api/p4/semaforo");
  const dist = useApi<Dist>("/api/p5/distribucion");

  // P1 / volumen: último mes y comparaciones desde la serie mensual
  const serie = (evo.data ?? []).filter((r) => r.pedidos && r.ingreso);
  const last = serie[serie.length - 1];
  const prev = serie[serie.length - 2];
  const yoy = serie.length > 12 ? serie[serie.length - 13] : undefined;

  // P3: peor región por puntualidad
  const peorReg = (reg.data ?? []).slice().sort((a, b) => a.pct_puntual - b.pct_puntual)[0];
  // P4: vendedores críticos
  const critico = (sem.data ?? []).find((s) => s.clasificacion === "Crítico");
  // P5: split de estrellas (variable bimodal → mostramos colas, no la media)
  const dd = dist.data?.distribucion ?? [];
  const pos5 = dd.filter((x) => x.score === 5).reduce((a, x) => a + x.pct, 0);
  const neg = dd.filter((x) => x.score <= 2).reduce((a, x) => a + x.pct, 0);

  const recompra = rec.data?.tasa_recompra_pct;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* P1 — Rentabilidad / salud del negocio */}
      <KpiStat
        label="Ingreso · último mes"
        loading={evo.loading}
        value={fmtCurrencyShort(last?.ingreso)}
        delta={yoy ? { pct: pctChange(last.ingreso, yoy.ingreso), goodWhenUp: true } : null}
        context={last ? `${last.periodo} · proyección anual ${fmtCurrencyShort(last.ingreso * 12)}` : ""}
      />

      {/* P2 — Retención (hallazgo estrella) */}
      <KpiStat
        label="Tasa de recompra"
        loading={rec.loading}
        value={fmtPct(recompra)}
        tone={recompra != null && recompra < 10 ? "bad" : "neutral"}
        context={rec.data ? `${fmtNumber(rec.data.recurrentes)} de ${fmtNumber(rec.data.clientes_unicos)} repiten` : ""}
      />

      {/* P3 — Logística */}
      <KpiStat
        label="% Retraso crítico"
        loading={p3.loading || reg.loading}
        value={fmtPct(p3.data?.pct_retraso_critico)}
        tone="bad"
        context={peorReg ? `peor región: ${peorReg.region} (${fmtPct(peorReg.pct_puntual)} puntual)` : ""}
      />

      {/* P4 — Vendedores */}
      <KpiStat
        label="% Ingreso · Vend. críticos"
        loading={sem.loading}
        value={fmtPct(critico?.pct_ingreso)}
        tone="warn"
        context={critico ? `${fmtNumber(critico.vendedores)} críticos (${fmtPct(critico.pct_vendedores)} del padrón)` : ""}
      />

      {/* P5 — Satisfacción (NPS en vez de media bimodal) */}
      <KpiStat
        label="NPS"
        loading={dist.loading}
        value={dist.data ? dist.data.nps_estimado.toFixed(1) : "—"}
        tone="warn"
        context={dd.length ? `${fmtPct(pos5)} 5★ · ${fmtPct(neg)} 1-2★` : ""}
      />

      {/* Volumen */}
      <KpiStat
        label="Pedidos · último mes"
        loading={evo.loading}
        value={fmtNumber(last?.pedidos)}
        delta={prev ? { pct: pctChange(last.pedidos, prev.pedidos), goodWhenUp: true } : null}
        context={last ? `${last.periodo} vs. mes previo` : ""}
      />
    </div>
  );
}
