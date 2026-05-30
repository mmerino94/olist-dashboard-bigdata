import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useApi } from "../../../api/client";
import { useFilters } from "../../../lib/filters";
import { colors } from "../../../lib/colors";
import { fmtNumber } from "../../../lib/format";

type Evo = { periodo: string; rating: number; resenas: number; pct_malas: number };
type Dist = { score: number; satisfaccion: string; n: number; pct: number };
type P5 = { distribucion: Dist[]; nps_estimado: number; total_resenas: number };

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const etiqueta = (ym: string) => `${MES[Number(ym.slice(5, 7))]} ${ym.slice(2, 4)}`;

function Estado({ loading, error, empty, h }: { loading: boolean; error: string | null; empty: boolean; h: number }) {
  const txt = loading ? "Cargando…" : error ? `Error: ${error}` : "Sin datos para este filtro";
  return (
    <div className="flex items-center justify-center text-sm font-mono text-gray" style={{ height: h }}>
      {txt}
    </div>
  );
}

export default function SatisfaccionPanel() {
  // Evolución = tendencia → sin filtro de período (sí reacciona a región/categoría).
  const evo = useApi<Evo[]>("/api/p5/evolucion", "", { sinPeriodo: true });
  const dist = useApi<P5>("/api/p5/distribucion");

  const serie = (evo.data ?? []).filter((r) => r.resenas).slice(-12);

  // Cross-filtering: clic en un mes filtra todo el dashboard.
  const { filters, setFilters } = useFilters();
  const onEvoClick = (p: any) => {
    const per = serie[p.dataIndex]?.periodo;
    if (!per) return;
    const activo = filters.meses.length === 1 && filters.meses[0] === per;
    setFilters({ meses: activo ? [] : [per] });
  };

  const evoOpt = {
    grid: { left: 34, right: 42, top: 26, bottom: 26 },
    legend: { data: ["rating", "% malas"], top: 0, right: 0, textStyle: { fontSize: 10, color: "#71706f" } },
    xAxis: {
      type: "category", data: serie.map((r) => etiqueta(r.periodo)),
      axisLabel: { fontSize: 9, color: "#71706f" }, axisLine: { lineStyle: { color: "#d1d0d6" } }, axisTick: { show: false },
    },
    yAxis: [
      { type: "value", min: 0, max: 5, axisLabel: { fontSize: 9, color: "#71706f" }, splitLine: { lineStyle: { color: "#f2f1f6" } } },
      { type: "value", min: 0, axisLabel: { fontSize: 9, color: "#71706f", formatter: "{value}%" }, splitLine: { show: false } },
    ],
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const r = serie[ps[0].dataIndex];
        return `<b>${etiqueta(r.periodo)}</b><br/>rating: ${r.rating}<br/>% malas: ${r.pct_malas}%<br/>reseñas: ${fmtNumber(r.resenas)}`;
      },
    },
    series: [
      {
        name: "rating", type: "line", yAxisIndex: 0, smooth: true, symbol: "circle", symbolSize: 6,
        data: serie.map((r) => r.rating),
        lineStyle: { color: colors.acento, width: 2.5 }, itemStyle: { color: colors.acento },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(60,120,187,0.18)" }, { offset: 1, color: "rgba(60,120,187,0.02)" }] } },
      },
      {
        name: "% malas", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 4,
        data: serie.map((r) => r.pct_malas),
        lineStyle: { color: colors.rojo, width: 1.5, type: "dashed" }, itemStyle: { color: colors.rojo },
      },
    ],
  };

  // --- Distribución de calificaciones (1★ a 5★) ---
  const dd = dist.data?.distribucion ?? [];
  const colorScore = (s: number) => (s <= 2 ? colors.rojo : s === 3 ? colors.gris : colors.verde);

  const distOpt = {
    grid: { left: 34, right: 14, top: 30, bottom: 24 },
    xAxis: {
      type: "category", data: dd.map((d) => `${d.score}★`),
      axisLabel: { fontSize: 11, color: "#54595f" }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    yAxis: { type: "value", axisLabel: { fontSize: 9, color: "#71706f", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#f2f1f6" } } },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const d = dd[ps[0].dataIndex];
        return `<b>${d.score}★</b><br/>${d.pct}% · ${fmtNumber(d.n)} reseñas`;
      },
    },
    series: [
      {
        type: "bar", barWidth: "58%",
        data: dd.map((d) => ({ value: d.pct, itemStyle: { color: colorScore(d.score) } })),
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => {
            const d = dd[p.dataIndex];
            return `{p|${d.pct}%}\n{n|${fmtNumber(d.n)}}`;
          },
          rich: {
            p: { fontSize: 9.5, fontWeight: 700, color: "#54595f" },
            n: { fontSize: 8.5, color: "#8b909c", padding: [1, 0, 0, 0] },
          },
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${colors.amarillo}` }}>
      <div className="flex items-start justify-between px-5 pt-4 pb-1">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.07em]" style={{ color: colors.amarillo }}>P5 · SATISFACCIÓN</div>
          <h3 className="text-[17px] font-semibold text-ink mt-0.5 leading-tight">Satisfacción del cliente</h3>
        </div>
        <Link to="/satisfaccion" className="text-[13px] font-medium text-blue-accent hover:underline shrink-0 mt-1">Profundizar →</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 px-5 pb-5">
        {/* Evolución mensual del rating */}
        <div className="lg:col-span-2">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Evolución mensual del rating <span className="text-blue-accent font-normal">· clic en un mes para filtrar</span>
          </div>
          {evo.loading || evo.error || serie.length === 0 ? (
            <Estado loading={evo.loading} error={evo.error} empty={serie.length === 0} h={220} />
          ) : (
            <ReactECharts option={evoOpt} style={{ height: 220 }} notMerge onEvents={{ click: onEvoClick }} />
          )}
        </div>

        {/* Distribución de calificaciones */}
        <div className="lg:col-span-1">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Distribución de calificaciones <span className="text-gray font-normal">· % por estrellas</span>
          </div>
          {dist.loading || dist.error || dd.length === 0 ? (
            <Estado loading={dist.loading} error={dist.error} empty={dd.length === 0} h={220} />
          ) : (
            <ReactECharts option={distOpt} style={{ height: 220 }} notMerge />
          )}
        </div>
      </div>
    </div>
  );
}
