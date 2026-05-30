// Vista 0 — Resumen Ejecutivo.
// Tesis del proyecto + KPIs globales + 5 insight cards (uno por problema).
// Lee resumen_kpis.json (1 fila con KPIs agregados de los 5 marts).
import HeroBanner from "../components/HeroBanner";
import KpiCard from "../components/KpiCard";
import InsightCard from "../components/InsightCard";
import { useSnapshot } from "../lib/useSnapshot";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";

type ResumenKpis = {
  ingreso_total: number;
  num_categorias: number;
  num_categorias_trampa: number;
  top_categoria: string;
  top_categoria_pct: number;
  total_clientes: number;
  clientes_one_time: number;
  clientes_champions: number;
  total_rutas: number;
  total_envios_delivered: number;
  pct_a_tiempo_global: number;
  total_vendedores: number;
  vendedores_criticos: number;
  pct_ingreso_criticos: number;
  pct_5_estrellas: number;
  pct_1_estrella: number;
  nps_promedio: number;
};

export default function Resumen() {
  const { data, loading, error } = useSnapshot<ResumenKpis[]>("resumen_kpis");
  const k = data?.[0];

  return (
    <div>
      <HeroBanner
        eyebrow="Vista 0 · Tesis del proyecto"
        title="Olist polariza: vende mucho pero pierde casi todos sus clientes"
        subtitle="No es un problema de retención, es de adquisición de mala calidad: el 97% de clientes nunca vuelve, vendedores Críticos generan 10% del ingreso, y las quejas se agrupan en 4 causas textuales identificables."
      />

      {/* KPIs globales */}
      <section className="px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Ingreso total"
          value={fmtCurrencyShort(k?.ingreso_total)}
          hint="Suma de precio + flete (delivered + shipped)"
          size="md"
        />
        <KpiCard
          label="Clientes únicos"
          value={fmtNumber(k?.total_clientes)}
          hint="customer_unique_id (delivered)"
          size="md"
        />
        <KpiCard
          label="Vendedores activos"
          value={fmtNumber(k?.total_vendedores)}
          hint="Con al menos un pedido"
          size="md"
        />
        <KpiCard
          label="% entrega a tiempo"
          value={k?.pct_a_tiempo_global ? fmtPct(k.pct_a_tiempo_global) : "—"}
          tone={
            k?.pct_a_tiempo_global && k.pct_a_tiempo_global >= 90
              ? "good"
              : k?.pct_a_tiempo_global && k.pct_a_tiempo_global >= 80
              ? "warn"
              : "bad"
          }
          hint="Promedio de 412 rutas"
          size="md"
        />
      </section>

      {/* 5 insight cards */}
      <section className="px-8 pb-10">
        <div className="text-[10.5px] tracking-[0.14em] uppercase text-gray font-mono mb-3">
          Los 5 hallazgos del proyecto
        </div>

        {loading && (
          <div className="text-sm text-gray font-mono py-8">
            Cargando snapshots del data mart...
          </div>
        )}

        {error && (
          <div className="text-sm text-bad font-mono py-8">
            Error cargando datos: {error}
          </div>
        )}

        {k && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InsightCard
              problema="P1 · RENTABILIDAD"
              titulo="El 80/20 es suave, y el flete envenena al top"
              kpi={`${k.num_categorias_trampa}/${k.num_categorias}`}
              kpiLabel={"categorías con flete > 35%\n— categorías trampa"}
              insight={`Top categoría: ${k.top_categoria} (${k.top_categoria_pct}% del ingreso). ${k.num_categorias_trampa} de ${k.num_categorias} categorías tienen flete sobre precio > 35%: estructuralmente erosionan margen.`}
              to="/rentabilidad"
              accent="warn"
            />

            <InsightCard
              problema="P2 · RETENCIÓN"
              titulo="No es retención, es adquisición de mala calidad"
              kpi={`${((k.clientes_one_time / k.total_clientes) * 100).toFixed(1)}%`}
              kpiLabel="de clientes\nnunca regresa"
              insight={`${fmtNumber(k.clientes_one_time)} de ${fmtNumber(k.total_clientes)} compran una vez y no vuelven. Solo ${fmtNumber(k.clientes_champions)} son Champions recurrentes (3%). La oportunidad NO es retener, es convertir.`}
              to="/retencion"
              accent="bad"
            />

            <InsightCard
              problema="P3 · LOGÍSTICA"
              titulo="Nordeste castiga más que la selva (y nadie lo había mirado)"
              kpi="5.85%"
              kpiLabel="retraso crítico Nordeste\nvs 3.93% Norte"
              insight={`Contraintuitivo: Norte parece el problema pero sus tiempos están bien calibrados. Nordeste tiene 5x más volumen y la promesa de fecha se subestima sistemáticamente.`}
              to="/logistica"
              accent="primary"
            />

            <InsightCard
              problema="P4 · VENDEDORES"
              titulo="Calidad ≠ escala. El #2 en ingreso es Crítico."
              kpi={`${k.pct_ingreso_criticos}%`}
              kpiLabel={`del ingreso en manos\nde ${fmtNumber(k.vendedores_criticos)} Críticos`}
              insight={`9 de 10 Críticos top son por rating bajo, no por puntualidad. El problema NO es operativo, es de calidad del producto/atención. Vendedores Elite (29%) solo generan 7% del ingreso.`}
              to="/vendedores"
              accent="bad"
            />

            <InsightCard
              problema="P5 · SATISFACCIÓN"
              titulo="Cuatro causas explican la mayoría de quejas escritas"
              kpi={fmtPct(k.nps_promedio, 1)}
              kpiLabel="NPS estimado\npromedio mensual"
              insight={`En bigramas negativos: devolución de dinero (241 menciones), defecto del producto (286), silencio del vendedor (202), calidad (105). 4 problemas concretos, no abstracciones.`}
              to="/satisfaccion"
              accent="primary"
            />

            <InsightCard
              problema="DISTRIBUCIÓN"
              titulo="Olist polariza — sin clientes 'tibios'"
              kpi={`${k.pct_5_estrellas}%`}
              kpiLabel={`★5\n+ ${k.pct_1_estrella}% ★1`}
              insight={`72% del feedback es polarizado (★5 + ★1-★2). Solo 28% en el medio. Los enojados escriben 2.5× más que los contentos: el corpus textual está sesgado a negativos.`}
              to="/satisfaccion"
              accent="good"
            />
          </div>
        )}
      </section>

      <footer className="border-t border-gray-200 px-8 py-4 text-[11px] text-gray font-mono">
        Datos: 7 data marts derivados del DW dimensional <code>OlistDW</code> (SQL Server) ·
        Reproducible en ~6s con <code>refresh_marts.py</code> ·
        Snapshot estático en <code>frontend/public/data/</code>
      </footer>
    </div>
  );
}
