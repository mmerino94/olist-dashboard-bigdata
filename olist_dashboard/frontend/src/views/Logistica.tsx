import { useApi } from "../api/client";
import KpiCard from "../components/KpiCard";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import RetrasoSatisfaccion from "../components/views/p3/RetrasoSatisfaccion";
import RegionesBar from "../components/views/p3/RegionesBar";
import { fmtNumber, fmtPct, fmtDays } from "../lib/format";

type Kpis = {
  pedidos: number;
  tiempo_promedio: number;
  pct_puntual: number;
  retraso_avg_atrasados: number;
  pct_retraso_critico: number;
};

type SatRetraso = {
  bucket_retraso: string;
  pedidos: number;
  rating_avg: number;
  pct_malas: number;
};

type Region = {
  region: string;
  pedidos: number;
  retraso_avg: number;
  pct_puntual: number;
};

type Ruta = {
  origen: string;
  destino: string;
  origen_region: string;
  destino_region: string;
  pedidos: number;
  dias_entrega_avg: number;
  retraso_avg: number;
  pct_puntual: number;
  pct_retraso_critico: number;
};

const COLUMNS: Column<Ruta>[] = [
  {
    key: "origen",
    label: "Ruta",
    align: "left",
    format: (_v, row) => `${row.origen} → ${row.destino}`,
  },
  {
    key: "destino_region",
    label: "Región destino",
    align: "left",
  },
  {
    key: "pedidos",
    label: "Pedidos",
    align: "right",
    format: (v) => fmtNumber(v),
  },
  {
    key: "dias_entrega_avg",
    label: "Días entrega",
    align: "right",
    format: (v) => fmtDays(v),
  },
  {
    key: "pct_puntual",
    label: "% puntual",
    align: "right",
    format: (v) => fmtPct(v),
  },
  {
    key: "pct_retraso_critico",
    label: "% retraso crítico",
    align: "right",
    format: (v, row) => (
      <span className={row.pct_retraso_critico >= 15 ? "text-bad font-semibold" : ""}>
        {fmtPct(v)}
      </span>
    ),
  },
];

export default function Logistica() {
  const kpisApi = useApi<Kpis>("/api/p3/kpis");
  const satApi = useApi<SatRetraso[]>("/api/p3/satisfaccion_vs_retraso");
  const regionesApi = useApi<Region[]>("/api/p3/regiones");
  const rutasApi = useApi<Ruta[]>("/api/p3/rutas");

  const kpis = kpisApi.data;
  const satRows = satApi.data ?? [];
  const regionesRows = regionesApi.data ?? [];
  const rutasRows = rutasApi.data ?? [];

  // Peor / mejor región por puntualidad — dinámico según filtros activos.
  const porPuntual = [...regionesRows].sort((a, b) => a.pct_puntual - b.pct_puntual);
  const peorRegion = porPuntual[0] ?? null;
  const mejorRegion = porPuntual[porPuntual.length - 1] ?? null;
  const ultimoBucket = satRows.length > 0 ? satRows[satRows.length - 1] : null;

  const loading =
    kpisApi.loading || satApi.loading || regionesApi.loading || rutasApi.loading;
  const error =
    kpisApi.error || satApi.error || regionesApi.error || rutasApi.error;

  if (loading) {
    return (
      <div className="p-8 text-gray text-sm flex items-center gap-2">
        <span className="animate-spin">⟳</span> Cargando logística…
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
          P3 · LOGÍSTICA
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Logística y tiempos de entrega
        </h1>
        <p className="text-sm text-gray max-w-2xl leading-relaxed">
          El retraso no se reparte parejo por geografía:{" "}
          <strong className="text-bad">
            {peorRegion ? peorRegion.region : "—"}
          </strong>{" "}
          es la región más castigada
          {peorRegion ? ` (solo ${fmtPct(peorRegion.pct_puntual)} puntual)` : ""}
          {mejorRegion && peorRegion && mejorRegion.region !== peorRegion.region ? (
            <>
              {" "}frente a{" "}
              <strong className="text-good">
                {mejorRegion.region} ({fmtPct(mejorRegion.pct_puntual)})
              </strong>
            </>
          ) : null}
          . Cada día de retraso dispara el % de reseñas malas — el impacto
          llega a{" "}
          <strong className="text-bad">
            {ultimoBucket ? `${ultimoBucket.pct_malas.toFixed(0)}%` : "—"}
          </strong>{" "}
          en retrasos superiores a 14 días.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="% puntual"
          value={kpis ? fmtPct(kpis.pct_puntual) : "—"}
          tone={kpis ? (kpis.pct_puntual >= 90 ? "good" : "bad") : "neutral"}
          hint="Pedidos entregados antes o en plazo"
        />
        <KpiCard
          label="Tiempo prom. entrega"
          value={kpis ? fmtDays(kpis.tiempo_promedio) : "—"}
          hint="Promedio general del período"
        />
        <KpiCard
          label="Retraso crítico %"
          value={kpis ? fmtPct(kpis.pct_retraso_critico) : "—"}
          tone="bad"
          hint="Entregas con retraso > 7 días"
        />
        <KpiCard
          label="Pedidos analizados"
          value={kpis ? fmtNumber(kpis.pedidos) : "—"}
          hint="Total pedidos con datos de entrega"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RetrasoSatisfaccion rows={satRows} />
        <RegionesBar rows={regionesRows} />
      </div>

      {/* Rutas table */}
      <div className="bg-paper border border-gray-200 rounded-lg p-5">
        <div className="font-semibold text-ink text-[15px] mb-1">
          Rutas problemáticas
        </div>
        <div className="text-[11px] text-gray mb-3">
          Top 15 rutas ordenadas por retraso — menor % puntual primero
        </div>
        <DataTable<Ruta>
          rows={rutasRows}
          columns={COLUMNS}
          initialSort="retraso_avg"
          maxRows={15}
        />
      </div>
    </div>
  );
}
