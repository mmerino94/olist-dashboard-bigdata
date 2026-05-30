import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort } from "../../../lib/format";

type Cat = { categoria: string; ingreso_total: number; flete_pct: number; pedidos: number };
type Props = { rows: Cat[] };

const colorFlete = (f: number) => (f >= 35 ? colors.rojo : f < 25 ? colors.verde : colors.acento);

export default function ScatterTrampa({ rows }: Props) {
  const maxPed = Math.max(1, ...rows.map((r) => r.pedidos));

  const option: any = {
    grid: { left: 64, right: 18, top: 20, bottom: 46 },
    xAxis: {
      type: "log",
      name: "Ingreso bruto (R$)",
      nameLocation: "middle",
      nameGap: 32,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
      axisLabel: { fontSize: 9, color: "#71706f", formatter: (v: number) => fmtCurrencyShort(v) },
    },
    yAxis: {
      name: "Flete sobre precio (%)",
      nameLocation: "middle",
      nameGap: 42,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
      axisLabel: { fontSize: 9, color: "#71706f", formatter: "{value}%" },
    },
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.value[3]}</b><br/>ingreso: ${fmtCurrencyShort(p.value[0])}<br/>flete: ${p.value[1].toFixed(1)}%<br/>pedidos: ${p.value[2].toLocaleString("es-PE")}`,
    },
    series: [
      {
        type: "scatter",
        symbolSize: (d: number[]) => 8 + Math.sqrt(d[2] / maxPed) * 46,
        data: rows.map((r) => ({
          value: [r.ingreso_total, r.flete_pct, r.pedidos, r.categoria],
          itemStyle: { color: colorFlete(r.flete_pct), opacity: 0.75, borderColor: "rgba(255,255,255,0.6)", borderWidth: 0.5 },
        })),
        markLine: {
          silent: true,
          symbol: "none",
          data: [
            { yAxis: 35, lineStyle: { color: colors.rojo, type: "dashed", width: 1.2 }, label: { formatter: "trampa ≥ 35%", color: colors.rojo, fontSize: 10, position: "insideEndTop" } },
            { yAxis: 25, lineStyle: { color: colors.verde, type: "dashed", width: 1.2 }, label: { formatter: "estrella < 25%", color: colors.verde, fontSize: 10, position: "insideEndBottom" } },
          ],
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">Flete sobre precio × Ingreso bruto</div>
        <div className="text-[11px] text-gray mt-0.5">
          x: ingreso bruto (log) · y: flete sobre precio · tamaño de burbuja: nº de pedidos
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 360 }} notMerge />
    </div>
  );
}
