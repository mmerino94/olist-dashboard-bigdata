import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useApi } from "../../../api/client";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort } from "../../../lib/format";

type SerieMes = { periodo: string; ingreso: number; pedidos: number; pct_retraso_critico: number; nps: number };
type Cat = { categoria: string; pct_ingreso: number; pct_acumulado: number };

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const etiqueta = (ym: string) => `${MES[Number(ym.slice(5, 7))]} ${ym.slice(2, 4)}`;
const kPed = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const npsColor = (v: number) => (v >= 45 ? "text-good" : v >= 30 ? "text-warn" : "text-bad");
const retColor = (v: number) => (v >= 5 ? "text-bad" : v >= 2 ? "text-warn" : "text-gray");
const corta = (s: string) => (s.length > 16 ? s.slice(0, 15) + "…" : s);

function Estado({ loading, error, empty, h }: { loading: boolean; error: string | null; empty: boolean; h: number }) {
  const txt = loading ? "Cargando…" : error ? `Error: ${error}` : "Sin datos para este filtro";
  return (
    <div className="flex items-center justify-center text-sm font-mono text-gray" style={{ height: h }}>
      {txt}
    </div>
  );
}

export default function RentabilidadPanel() {
  const evo = useApi<SerieMes[]>("/api/resumen/serie_mensual", "", { sinPeriodo: true });
  const cat = useApi<Cat[]>("/api/p1/categorias");

  const serie = (evo.data ?? []).filter((r) => r.ingreso).slice(-12);
  const top = [...(cat.data ?? [])].sort((a, b) => b.pct_ingreso - a.pct_ingreso).slice(0, 8).reverse();

  const trendOpt = {
    grid: { left: 10, right: 10, top: 26, bottom: 6 },
    xAxis: {
      type: "category",
      data: serie.map((r) => etiqueta(r.periodo)),
      axisLine: { lineStyle: { color: "#e3e2e8" } },
      axisLabel: { show: false },
      axisTick: { show: false },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#f2f1f6" } }, axisLabel: { show: false } },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const r = serie[ps[0].dataIndex];
        return `<b>${etiqueta(r.periodo)}</b><br/>ingreso: ${fmtCurrencyShort(r.ingreso)}<br/>pedidos: ${r.pedidos.toLocaleString("es-PE")}<br/>retraso crítico: ${r.pct_retraso_critico}%<br/>NPS: ${r.nps}`;
      },
    },
    series: [
      {
        type: "line",
        data: serie.map((r) => r.ingreso),
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { color: colors.acento, width: 2.5 },
        itemStyle: { color: colors.acento },
        label: { show: true, position: "top", fontSize: 9.5, fontWeight: 600, color: colors.primario, formatter: (p: any) => fmtCurrencyShort(p.value) },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(60,120,187,0.20)" },
              { offset: 1, color: "rgba(60,120,187,0.02)" },
            ],
          },
        },
      },
    ],
  };

  const paretoOpt = {
    grid: { left: 96, right: 38, top: 18, bottom: 22 },
    xAxis: [
      { type: "value", axisLine: { lineStyle: { color: "#d1d0d6" } }, axisLabel: { fontSize: 9, color: "#71706f", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#f2f1f6" } } },
      { type: "value", min: 0, max: 100, show: false },
    ],
    yAxis: {
      type: "category",
      data: top.map((r) => corta(r.categoria)),
      axisLabel: { fontSize: 9.5, color: "#54595f" },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const r = top[ps[0].dataIndex];
        return `<b>${r.categoria}</b><br/>% ingreso: ${r.pct_ingreso.toFixed(1)}%<br/>% acumulado: ${r.pct_acumulado.toFixed(1)}%`;
      },
    },
    series: [
      {
        name: "% ingreso", type: "bar", xAxisIndex: 0, barWidth: "62%",
        data: top.map((r) => r.pct_ingreso),
        itemStyle: { color: colors.acento },
        label: { show: true, position: "right", fontSize: 9, color: "#54595f", formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
      {
        name: "% acumulado", type: "line", xAxisIndex: 1,
        data: top.map((r) => r.pct_acumulado),
        lineStyle: { color: colors.amarillo, width: 2 }, itemStyle: { color: colors.amarillo }, symbol: "circle", symbolSize: 5,
        label: { show: true, position: "top", fontSize: 9, fontWeight: 600, color: colors.amarillo, formatter: (p: any) => `${Math.round(p.value)}%` },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${colors.primario}` }}>
      {/* Encabezado único */}
      <div className="flex items-start justify-between px-5 pt-4 pb-1">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.07em]" style={{ color: colors.primario }}>
            P1 · RENTABILIDAD
          </div>
          <h3 className="text-[17px] font-semibold text-ink mt-0.5 leading-tight">Rentabilidad del negocio</h3>
        </div>
        <Link to="/rentabilidad" className="text-[13px] font-medium text-blue-accent hover:underline shrink-0 mt-1">
          Profundizar →
        </Link>
      </div>

      {/* Subsecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 px-5 pb-5">
        {/* Ingreso mensual */}
        <div className="lg:col-span-2">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Ingreso mensual · últimos 12 meses
          </div>
          {evo.loading || evo.error || serie.length === 0 ? (
            <Estado loading={evo.loading} error={evo.error} empty={serie.length === 0} h={232} />
          ) : (
            <>
              <ReactECharts option={trendOpt} style={{ height: 200 }} notMerge />
              <div className="grid grid-cols-12 gap-1 mt-1 px-[10px]">
                {serie.map((r) => (
                  <div key={r.periodo} className="flex flex-col items-center text-center border-t border-gray-100 pt-1.5">
                    <div className="text-[9px] font-mono text-gray leading-tight">{etiqueta(r.periodo)}</div>
                    <div className="text-[10px] font-semibold text-ink tabular-nums leading-tight mt-0.5">{fmtCurrencyShort(r.ingreso)}</div>
                    <div className="text-[9px] text-gray tabular-nums leading-tight">{kPed(r.pedidos)} ped</div>
                    <div className={`text-[9px] tabular-nums leading-tight ${retColor(r.pct_retraso_critico)}`}>{r.pct_retraso_critico}% ret</div>
                    <div className={`text-[9px] tabular-nums leading-tight ${npsColor(r.nps)}`}>NPS {r.nps}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pareto categorías */}
        <div className="lg:col-span-1">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Pareto de categorías <span className="text-gray font-normal">· línea ámbar = % acumulado</span>
          </div>
          {cat.loading || cat.error || top.length === 0 ? (
            <Estado loading={cat.loading} error={cat.error} empty={top.length === 0} h={240} />
          ) : (
            <ReactECharts option={paretoOpt} style={{ height: 240 }} notMerge />
          )}
        </div>
      </div>
    </div>
  );
}
