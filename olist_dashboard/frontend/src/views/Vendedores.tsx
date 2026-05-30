import { useMemo } from "react";
import { useApi } from "../api/client";
import KpiCard from "../components/KpiCard";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import ScatterVendedores from "../components/views/p4/ScatterVendedores";
import SemaforoBar from "../components/views/p4/SemaforoBar";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";
import { sellerColors } from "../lib/colors";

const NIVELES: { nombre: string; rango: string }[] = [
  { nombre: "Elite", rango: "> 88" },
  { nombre: "Estándar", rango: "75 – 88" },
  { nombre: "En observación", rango: "60 – 75" },
  { nombre: "Crítico", rango: "< 60" },
];

type Semaforo = {
  clasificacion: string;
  vendedores: number;
  ingreso: number;
  rating_avg: number;
  puntualidad_avg: number;
  pct_vendedores: number;
  pct_ingreso: number;
};

type ScatterRow = {
  id_vendedor: string;
  region: string;
  pedidos: number;
  ingreso: number;
  puntualidad: number;
  rating: number;
  clasificacion: string;
};

type TopRow = {
  id_vendedor: string;
  estado: string;
  region: string;
  pedidos: number;
  ingreso: number;
  puntualidad: number;
  rating: number;
  pct_malas: number;
  retraso_avg: number;
  score: number;
  clasificacion: string;
};

function derivarRazon(row: TopRow): string {
  const esCalidad = row.rating < 3.5;
  const esTiempo = row.puntualidad < 0.8;
  if (esCalidad && esTiempo) return "Calidad+Tiempo";
  if (esCalidad) return "Calidad";
  if (esTiempo) return "Tiempo";
  return "Score";
}

const COLUMNS: Column<TopRow>[] = [
  {
    key: "id_vendedor",
    label: "Vendedor",
    align: "left",
    format: (v) => (
      <span className="font-mono text-[11px]" title={String(v)}>
        {String(v).slice(0, 8)}…
      </span>
    ),
  },
  { key: "region", label: "Región", align: "left" },
  {
    key: "ingreso",
    label: "Ingreso",
    align: "right",
    format: (v) => fmtCurrencyShort(v),
  },
  {
    key: "pedidos",
    label: "Pedidos",
    align: "right",
    format: (v) => fmtNumber(v),
  },
  {
    key: "rating",
    label: "Rating",
    align: "right",
    format: (v) => (v as number).toFixed(2),
  },
  {
    key: "puntualidad",
    label: "% puntual",
    align: "right",
    format: (v) => fmtPct((v as number) * 100),
  },
  {
    key: "pct_malas",
    label: "% malas",
    align: "right",
    format: (v, row) => (
      <span className={row.pct_malas >= 50 ? "text-bad font-semibold" : ""}>
        {fmtPct(v)}
      </span>
    ),
  },
  {
    key: "score",
    label: "Razón",
    align: "left",
    format: (_v, row) => (
      <span className="text-[11px] font-mono text-bad">{derivarRazon(row)}</span>
    ),
  },
];

export default function Vendedores() {
  const semaforoApi = useApi<Semaforo[]>("/api/p4/semaforo");
  const scatterApi = useApi<ScatterRow[]>("/api/p4/scatter");
  const topApi = useApi<TopRow[]>("/api/p4/top", "tipo=peores&n=10");

  const semaforoRows = semaforoApi.data ?? [];
  const scatterRows = scatterApi.data ?? [];
  const topRows = topApi.data ?? [];

  const loading = semaforoApi.loading || scatterApi.loading || topApi.loading;
  const error = semaforoApi.error || scatterApi.error || topApi.error;

  const kpis = useMemo(() => {
    if (!semaforoRows.length) return null;
    const totalVendedores = semaforoRows.reduce((s, r) => s + r.vendedores, 0);
    const critico = semaforoRows.find((r) => r.clasificacion === "Crítico");
    const pctCriticos = critico?.pct_vendedores ?? 0;
    const pctIngresoCriticos = critico?.pct_ingreso ?? 0;
    const topCriticoIngreso =
      topRows.length > 0 ? Math.max(...topRows.map((r) => r.ingreso)) : null;
    return { totalVendedores, pctCriticos, pctIngresoCriticos, topCriticoIngreso };
  }, [semaforoRows, topRows]);

  if (loading) {
    return (
      <div className="p-8 text-gray text-sm flex items-center gap-2">
        <span className="animate-spin">⟳</span> Cargando vendedores…
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
          P4 · VENDEDORES
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Desempeño de vendedores
        </h1>
        <p className="text-sm text-gray max-w-2xl leading-relaxed">
          Calidad ≠ Escala:{" "}
          <strong className="text-bad">
            críticos ({kpis ? fmtPct(kpis.pctCriticos) : "—"})
          </strong>{" "}
          concentran{" "}
          <strong className="text-bad">
            {kpis ? fmtPct(kpis.pctIngresoCriticos) : "—"} del ingreso
          </strong>
          . El problema no es volumen — es selección y seguimiento activo de vendedores
          que dañan la experiencia del cliente.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Vendedores activos"
          value={kpis ? fmtNumber(kpis.totalVendedores) : "—"}
          hint="Vendedores con al menos 1 venta en el período"
        />
        <KpiCard
          label="% Críticos"
          value={kpis ? fmtPct(kpis.pctCriticos) : "—"}
          tone="bad"
          hint="Vendedores clasificados como Crítico"
        />
        <KpiCard
          label="% Ingreso Críticos"
          value={kpis ? fmtPct(kpis.pctIngresoCriticos) : "—"}
          tone="bad"
          hint="Porcentaje del ingreso total en manos de vendedores Críticos"
        />
        <KpiCard
          label="Top crítico ingreso"
          value={kpis?.topCriticoIngreso != null ? fmtCurrencyShort(kpis.topCriticoIngreso) : "—"}
          hint="Mayor ingreso entre los 10 peores vendedores"
          tone="bad"
          size="sm"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScatterVendedores rows={scatterRows} />
        <SemaforoBar rows={semaforoRows} />
      </div>

      {/* Definición del score y sus categorías */}
      <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
        <div>
          <div className="font-semibold text-ink text-[15px]">
            Cómo se calcula el score y la clasificación
          </div>
          <div className="text-[12px] text-gray mt-1 leading-relaxed">
            Cada vendedor (con <strong className="text-ink">≥ 5 pedidos</strong>) recibe un{" "}
            <strong className="text-ink">score de 0 a 100</strong> que pondera cuatro señales:
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11.5px]">
          <span className="px-2.5 py-1 rounded bg-bg text-ink font-mono">puntualidad · 40%</span>
          <span className="px-2.5 py-1 rounded bg-bg text-ink font-mono">rating · 35%</span>
          <span className="px-2.5 py-1 rounded bg-bg text-ink font-mono">reseñas no-malas · 15%</span>
          <span className="px-2.5 py-1 rounded bg-bg text-ink font-mono">bajo retraso · 10%</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          {NIVELES.map((n) => (
            <div
              key={n.nombre}
              className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sellerColors[n.nombre] }}
              />
              <div className="leading-tight">
                <div className="text-[12.5px] font-semibold text-ink">{n.nombre}</div>
                <div className="text-[11px] text-gray font-mono">score {n.rango}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 críticos table */}
      <div className="bg-paper border border-gray-200 rounded-lg p-5">
        <div className="font-semibold text-ink text-[15px] mb-1">
          Top 10 peores vendedores
        </div>
        <div className="text-[11px] text-gray mb-3">
          Ordenados por score compuesto (menor es peor) — todos clasificación Crítico
        </div>
        <DataTable<TopRow>
          rows={topRows}
          columns={COLUMNS}
          initialSort="score"
        />
      </div>
    </div>
  );
}
