import { useMemo } from "react";
import { useApi } from "../api/client";
import KpiCard from "../components/KpiCard";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import SegmentosTreemap from "../components/views/p2/SegmentosTreemap";
import SegmentosBar from "../components/views/p2/SegmentosBar";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";

type Seg = {
  segmento: string;
  clientes: number;
  ingreso: number;
  ticket_avg: number;
  recency_avg: number;
  frequency_avg: number;
  pct_clientes: number;
  pct_ingreso: number;
};

type Recompra = {
  clientes_unicos: number;
  una_compra: number;
  recurrentes: number;
  tasa_recompra_pct: number;
  clv_aprox: number;
};

const COLUMNS: Column<Seg>[] = [
  { key: "segmento", label: "Segmento", align: "left" },
  {
    key: "clientes",
    label: "Clientes",
    align: "right",
    format: (v) => fmtNumber(v),
  },
  {
    key: "pct_clientes",
    label: "% clientes",
    align: "right",
    format: (v) => fmtPct(v),
  },
  {
    key: "ingreso",
    label: "Ingreso",
    align: "right",
    format: (v) => fmtCurrencyShort(v),
  },
  {
    key: "pct_ingreso",
    label: "% ingreso",
    align: "right",
    format: (v) => fmtPct(v),
  },
  {
    key: "ticket_avg",
    label: "Ticket avg",
    align: "right",
    format: (v) => fmtCurrencyShort(v),
  },
  {
    key: "recency_avg",
    label: "Recencia avg",
    align: "right",
    format: (v) => fmtNumber(v) + " d",
  },
];

export default function Retencion() {
  const segApi = useApi<Seg[]>("/api/p2/segmentos");
  const recompraApi = useApi<Recompra>("/api/p2/recompra");

  const rows = segApi.data ?? [];
  const recompra = recompraApi.data;

  const oneTimePct = useMemo(() => {
    if (!recompra) return null;
    return (recompra.una_compra / recompra.clientes_unicos) * 100;
  }, [recompra]);

  // % de ingreso en manos de one-timers de alto valor (Campeones + En riesgo).
  const altoValorPct = rows
    .filter((r) => r.segmento === "Campeones" || r.segmento === "En riesgo")
    .reduce((a, r) => a + r.pct_ingreso, 0);

  const loading = segApi.loading || recompraApi.loading;
  const error = segApi.error || recompraApi.error;

  if (loading) {
    return (
      <div className="p-8 text-gray text-sm flex items-center gap-2">
        <span className="animate-spin">⟳</span> Cargando retención…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-bad text-sm">Error al cargar: {error}</div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gray">
          P2 · RETENCIÓN · RFM
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Retención y clientes (RFM)
        </h1>
        <p className="text-sm text-gray max-w-2xl leading-relaxed">
          La oportunidad no es retener al{" "}
          <strong className="text-good">
            {recompra ? fmtPct(recompra.tasa_recompra_pct) : "—"} recurrente
          </strong>
          , es convertir al{" "}
          <strong className="text-bad">
            {oneTimePct != null ? fmtPct(oneTimePct) : "—"} one-time
          </strong>
          . Entre los de una sola compra, los de <strong className="text-ink">alto valor</strong>{" "}
          (Campeones y En riesgo) concentran{" "}
          <strong className="text-ink">{fmtPct(altoValorPct, 0)} del ingreso</strong>: ahí está la
          oportunidad de reactivación.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Clientes únicos"
          value={recompra ? fmtNumber(recompra.clientes_unicos) : "—"}
          hint="Total período filtrado"
        />
        <KpiCard
          label="Tasa recompra"
          value={recompra ? fmtPct(recompra.tasa_recompra_pct) : "—"}
          tone={
            recompra
              ? recompra.tasa_recompra_pct < 10
                ? "bad"
                : "good"
              : "neutral"
          }
          hint="% clientes con >1 compra"
        />
        <KpiCard
          label="One-time %"
          value={oneTimePct != null ? fmtPct(oneTimePct) : "—"}
          tone="bad"
          hint="Compraron solo una vez"
        />
        <KpiCard
          label="CLV aprox"
          value={recompra ? fmtCurrencyShort(recompra.clv_aprox) : "—"}
          hint="Valor de vida medio del cliente"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SegmentosTreemap rows={rows} />
        <SegmentosBar rows={rows} />
      </div>

      {/* Table */}
      <div className="bg-paper border border-gray-200 rounded-lg p-5">
        <div className="font-semibold text-ink text-[15px] mb-3">
          Segmentos RFM
        </div>
        <DataTable<Seg>
          rows={rows}
          columns={COLUMNS}
          initialSort="ingreso"
        />
      </div>
    </div>
  );
}
