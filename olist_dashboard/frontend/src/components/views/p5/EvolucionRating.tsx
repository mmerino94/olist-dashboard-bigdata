import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  anio: number;
  mes: number;
  rating: number;
  resenas: number;
  pct_malas: number;
  periodo: string;
};

type Props = { rows: Row[] };

export default function EvolucionRating({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const periodos = sorted.map((r) => r.periodo);

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 52, right: 56, top: 48, bottom: 60 },
    legend: {
      top: 8,
      right: 8,
      textStyle: { fontSize: 11, color: colors.gris },
      itemWidth: 12,
      itemHeight: 12,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        if (!params.length) return "";
        const periodo = params[0].name;
        const idx = params[0].dataIndex;
        const row = sorted[idx];
        return (
          `<b>${periodo}</b><br/>` +
          `Rating: <b>${(row?.rating ?? 0).toFixed(2)}</b><br/>` +
          `% reseñas malas: <b>${(row?.pct_malas ?? 0).toFixed(1)}%</b><br/>` +
          `<span style="font-size:10px;color:${colors.gris}">Reseñas: ${(row?.resenas ?? 0).toLocaleString("es-PE")}</span>`
        );
      },
    },
    xAxis: {
      type: "category",
      data: periodos,
      axisLabel: {
        fontSize: 9,
        color: colors.gris,
        rotate: 45,
        interval: Math.floor(periodos.length / 12),
      },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "Rating",
        nameTextStyle: { fontSize: 10, color: colors.acento },
        min: 0,
        max: 5,
        axisLabel: {
          formatter: (v: number) => v.toFixed(1),
          fontSize: 10,
          color: colors.gris,
        },
        axisLine: { show: true, lineStyle: { color: colors.acento } },
        splitLine: { lineStyle: { color: "#ecebf1" } },
      },
      {
        type: "value",
        name: "% malas",
        nameTextStyle: { fontSize: 10, color: colors.rojo },
        min: 0,
        max: 100,
        axisLabel: {
          formatter: (v: number) => `${v}%`,
          fontSize: 10,
          color: colors.gris,
        },
        axisLine: { show: true, lineStyle: { color: colors.rojo } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Rating mensual",
        type: "line",
        yAxisIndex: 0,
        data: sorted.map((r) => r.rating),
        lineStyle: { color: colors.acento, width: 2 },
        itemStyle: { color: colors.acento },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors.acento + "55" },
              { offset: 1, color: colors.acento + "05" },
            ],
          },
        },
        symbol: "circle",
        symbolSize: 4,
        smooth: true,
      },
      {
        name: "% reseñas malas",
        type: "line",
        yAxisIndex: 1,
        data: sorted.map((r) => r.pct_malas),
        lineStyle: { color: colors.rojo, width: 1.5, type: "dashed" },
        itemStyle: { color: colors.rojo },
        symbol: "circle",
        symbolSize: 3,
        smooth: true,
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-gray mb-0.5">
          P5 · SATISFACCIÓN
        </div>
        <div className="font-semibold text-ink text-[15px]">
          Evolución mensual del rating
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Rating promedio (eje izq.) y % reseñas malas (eje der.) por período
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} notMerge />
    </div>
  );
}
