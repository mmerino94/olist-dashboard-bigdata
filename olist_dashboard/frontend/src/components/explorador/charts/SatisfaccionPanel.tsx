import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useApi } from "../../../api/client";
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

  // --- Balance + NPS ---
  const dd = dist.data?.distribucion ?? [];
  const nps = dist.data?.nps_estimado ?? 0;
  const sum = (pred: (d: Dist) => boolean) => Math.round(dd.filter(pred).reduce((a, d) => a + d.pct, 0) * 10) / 10;
  const malas = sum((d) => d.score <= 2);
  const regular = sum((d) => d.score === 3);
  const buenas = sum((d) => d.score >= 4);

  const balOpt = {
    grid: { left: 8, right: 8, top: 14, bottom: 86 },
    xAxis: { type: "value", max: 100, show: false },
    yAxis: { type: "category", data: ["Reseñas"], show: false },
    tooltip: { trigger: "item" },
    series: [
      { name: "Malas", type: "bar", stack: "x", data: [malas], itemStyle: { color: colors.rojo }, label: { show: true, formatter: `${malas}%`, color: "#fff", fontSize: 10 } },
      { name: "Regular", type: "bar", stack: "x", data: [regular], itemStyle: { color: colors.gris } },
      { name: "Buenas", type: "bar", stack: "x", data: [buenas], itemStyle: { color: colors.verde }, label: { show: true, formatter: `${buenas}%`, color: "#fff", fontSize: 10 } },
      {
        type: "gauge", center: ["50%", "120%"], radius: "120%", startAngle: 180, endAngle: 0,
        min: -100, max: 100, splitNumber: 4,
        progress: { show: true, width: 12, itemStyle: { color: colors.amarillo } },
        axisLine: { lineStyle: { width: 12, color: [[1, "#ecebf1"]] } },
        axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false }, pointer: { show: false },
        detail: { valueAnimation: true, offset: [0, -16], fontSize: 22, fontWeight: 700, color: colors.primario, formatter: "NPS {value}" },
        data: [{ value: nps }],
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
            Evolución mensual del rating <span className="text-gray font-normal">· línea roja = % reseñas malas</span>
          </div>
          {evo.loading || evo.error || serie.length === 0 ? (
            <Estado loading={evo.loading} error={evo.error} empty={serie.length === 0} h={220} />
          ) : (
            <ReactECharts option={evoOpt} style={{ height: 220 }} notMerge />
          )}
        </div>

        {/* Balance + NPS */}
        <div className="lg:col-span-1">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Balance de reseñas + NPS
          </div>
          {dist.loading || dist.error || dd.length === 0 ? (
            <Estado loading={dist.loading} error={dist.error} empty={dd.length === 0} h={220} />
          ) : (
            <ReactECharts option={balOpt} style={{ height: 220 }} notMerge />
          )}
        </div>
      </div>
    </div>
  );
}
