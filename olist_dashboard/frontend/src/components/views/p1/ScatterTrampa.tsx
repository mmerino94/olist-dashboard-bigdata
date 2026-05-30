import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Cat = {
  categoria: string;
  ingreso_total: number;
  flete_pct: number;
  pct_resenas_malas: number;
};

type Props = { rows: Cat[] };

export default function ScatterTrampa({ rows }: Props) {
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso_total));

  const colorDot = (c: Cat) =>
    c.flete_pct >= 35 && c.pct_resenas_malas >= 15
      ? colors.rojo
      : c.flete_pct < 25 && c.pct_resenas_malas < 12
      ? colors.verde
      : colors.acento;

  const option: any = {
    grid: { left: 52, right: 16, top: 24, bottom: 44 },
    xAxis: {
      name: "% reseñas malas",
      nameLocation: "middle",
      nameGap: 28,
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      name: "flete %",
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.value[3]}</b><br/>reseñas malas: ${p.value[0].toFixed(1)}%<br/>flete: ${p.value[1].toFixed(1)}%<br/>ingreso: R$${(
          p.value[2] / 1000
        ).toFixed(0)}k`,
    },
    series: [
      {
        type: "scatter",
        symbolSize: (d: number[]) => 8 + (d[2] / maxIng) * 44,
        data: rows.map((r) => ({
          value: [r.pct_resenas_malas, r.flete_pct, r.ingreso_total, r.categoria],
          itemStyle: { color: colorDot(r), opacity: 0.78 },
        })),
      },
      {
        // Reference line y=35 (zona trampa)
        type: "line",
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: colors.rojo, type: "dashed", width: 1.5 },
          data: [{ yAxis: 35, label: { formatter: "flete 35%", position: "insideEndTop", color: colors.rojo, fontSize: 11 } }],
        },
        data: [],
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-gray mb-0.5">
          P1 · RENTABILIDAD
        </div>
        <div className="font-semibold text-ink text-[15px]">Matriz estrella / trampa</div>
        <div className="text-[11px] text-gray mt-0.5">
          x: % reseñas malas · y: flete % · tamaño: ingreso ·{" "}
          <span className="text-[#a8423a]">■</span> trampa{" "}
          <span className="text-[#2f7d5b]">■</span> estrella{" "}
          <span className="text-[#3c78bb]">■</span> resto
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 360 }} notMerge />
    </div>
  );
}
