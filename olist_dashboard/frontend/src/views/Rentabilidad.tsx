import { useMemo } from "react";
import { useApi } from "../api/client";
import KpiCard from "../components/KpiCard";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import IngresoMensual from "../components/views/p1/IngresoMensual";
import ScatterTrampa from "../components/views/p1/ScatterTrampa";
import DefinicionCategorias from "../components/views/p1/DefinicionCategorias";
import ParetoCategorias from "../components/views/p1/ParetoCategorias";
import { fmtCurrencyShort, fmtPct } from "../lib/format";

type Cat = {
  categoria: string;
  pedidos: number;
  unidades_vendidas: number;
  ingreso_total: number;
  ticket_promedio: number;
  flete_pct: number;
  pct_puntual: number;
  pct_resenas_malas: number;
  pct_ingreso: number;
  pct_acumulado: number;
  pareto: string;
};

const COLUMNS: Column<Cat>[] = [
  { key: "categoria", label: "Categoría", align: "left" },
  { key: "pedidos", label: "Pedidos", align: "right", format: (v) => v.toLocaleString("es-PE") },
  {
    key: "ingreso_total",
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
    key: "pct_acumulado",
    label: "% acum",
    align: "right",
    format: (v) => fmtPct(v),
  },
  {
    key: "flete_pct",
    label: "Flete %",
    align: "right",
    format: (v, row) => (
      <span className={row.flete_pct >= 35 ? "text-bad font-semibold" : ""}>{fmtPct(v)}</span>
    ),
  },
  {
    key: "pct_resenas_malas",
    label: "% reseñas malas",
    align: "right",
    format: (v) => fmtPct(v),
  },
  {
    key: "pct_puntual",
    label: "% puntual",
    align: "right",
    format: (v) => fmtPct(v),
  },
];

export default function Rentabilidad() {
  const { data, loading, error } = useApi<Cat[]>("/api/p1/categorias");
  const rows = data ?? [];

  const kpis = useMemo(() => {
    if (!rows.length) return null;
    const ingresoTotal = rows.reduce((s, r) => s + r.ingreso_total, 0);
    const catalogo = rows.length;
    const trampa = rows.filter((r) => r.flete_pct >= 35).length;
    const lider = rows.reduce((best, r) => (r.pct_ingreso > best.pct_ingreso ? r : best), rows[0]);
    return { ingresoTotal, catalogo, trampa, lider };
  }, [rows]);

  if (loading) {
    return (
      <div className="p-8 text-gray text-sm flex items-center gap-2">
        <span className="animate-spin">⟳</span> Cargando categorías…
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
          P1 · RENTABILIDAD
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Rentabilidad por categoría
        </h1>
        <p className="text-sm text-gray max-w-2xl leading-relaxed">
          El 80/20 es suave y el flete envenena al top:{" "}
          <strong className="text-bad">
            {kpis?.trampa ?? "—"} categorías (flete &gt; 35%)
          </strong>{" "}
          erosionan margen — concentran volumen pero sacrifican rentabilidad neta.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Ingreso total"
          value={kpis ? fmtCurrencyShort(kpis.ingresoTotal) : "—"}
          hint="Suma del período filtrado"
        />
        <KpiCard
          label="Catálogo"
          value={kpis?.catalogo ?? "—"}
          unit="categorías"
          hint="Categorías con ventas"
        />
        <KpiCard
          label="Categorías trampa"
          value={kpis?.trampa ?? "—"}
          unit="flete ≥ 35%"
          tone={kpis && kpis.trampa > 0 ? "bad" : "neutral"}
          hint="Flete alto erosiona margen"
        />
        <KpiCard
          label="Categoría líder"
          value={kpis?.lider.categoria ?? "—"}
          hint={kpis ? `${fmtPct(kpis.lider.pct_ingreso)} del ingreso total` : undefined}
          tone="good"
          size="sm"
        />
      </div>

      {/* Matriz estrella/trampa + definiciones · luego ingreso mensual + Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScatterTrampa rows={rows} />
        </div>
        <DefinicionCategorias rows={rows} />
        <div className="lg:col-span-2">
          <IngresoMensual />
        </div>
        <ParetoCategorias rows={rows} />
      </div>

      {/* Table */}
      <div className="bg-paper border border-gray-200 rounded-lg p-5">
        <div className="font-semibold text-ink text-[15px] mb-3">
          Todas las categorías
        </div>
        <DataTable<Cat>
          rows={rows}
          columns={COLUMNS}
          initialSort="ingreso_total"
        />
      </div>
    </div>
  );
}
