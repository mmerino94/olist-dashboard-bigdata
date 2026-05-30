import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort } from "../../../lib/format";

type SerieMes = {
  periodo: string;
  ingreso: number;
  pedidos: number;
  pct_retraso_critico: number;
  nps: number;
};

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const etiqueta = (ym: string) => `${MES[Number(ym.slice(5, 7))]} ${ym.slice(2, 4)}`; // "Ago 18"
const kPed = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const npsColor = (v: number) => (v >= 45 ? "text-good" : v >= 30 ? "text-warn" : "text-bad");
const retColor = (v: number) => (v >= 5 ? "text-bad" : v >= 2 ? "text-warn" : "text-gray");

export default function TrendIngreso() {
  // Serie completa (sin filtro de período); reacciona a región / categoría / estado.
  const { data, loading, error } = useApi<SerieMes[]>("/api/resumen/serie_mensual", "", { sinPeriodo: true });
  const serie = (data ?? []).filter((r) => r.ingreso).slice(-12);

  const option = {
    grid: { left: 10, right: 10, top: 26, bottom: 6 },
    xAxis: {
      type: "category",
      data: serie.map((r) => etiqueta(r.periodo)),
      axisLine: { lineStyle: { color: "#e3e2e8" } },
      axisLabel: { show: false },
      axisTick: { show: false },
    },
    yAxis: { type: "value", show: true, splitLine: { lineStyle: { color: "#f2f1f6" } }, axisLabel: { show: false } },
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
        label: {
          show: true,
          position: "top",
          fontSize: 9.5,
          fontWeight: 600,
          color: colors.primario,
          formatter: (p: any) => fmtCurrencyShort(p.value),
        },
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

  return (
    <PanelCard
      badge="P1 · RENTABILIDAD"
      accent={colors.primario}
      titulo="Ingreso mensual · últimos 12 meses"
      meta="etiqueta = ingreso del mes · mini-tarjetas: detalle por mes"
      to="/rentabilidad"
      toLabel="Profundizar en Rentabilidad"
      loading={loading}
      error={error}
      empty={serie.length === 0}
    >
      <ReactECharts option={option} style={{ height: 200 }} notMerge />

      {/* Mini-tarjetas por mes (alineadas bajo cada nodo) */}
      <div className="grid grid-cols-12 gap-1 mt-2 px-[10px]">
        {serie.map((r) => (
          <div
            key={r.periodo}
            className="flex flex-col items-center text-center border-t border-gray-100 pt-1.5"
            title={`${etiqueta(r.periodo)}`}
          >
            <div className="text-[9px] font-mono text-gray leading-tight">{etiqueta(r.periodo)}</div>
            <div className="text-[10px] font-semibold text-ink tabular-nums leading-tight mt-0.5">
              {fmtCurrencyShort(r.ingreso)}
            </div>
            <div className="text-[9px] text-gray tabular-nums leading-tight">{kPed(r.pedidos)} ped</div>
            <div className={`text-[9px] tabular-nums leading-tight ${retColor(r.pct_retraso_critico)}`}>
              {r.pct_retraso_critico}% ret
            </div>
            <div className={`text-[9px] tabular-nums leading-tight ${npsColor(r.nps)}`}>NPS {r.nps}</div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
