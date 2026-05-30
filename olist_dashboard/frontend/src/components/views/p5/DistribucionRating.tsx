import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  score: number;
  satisfaccion: string;
  n: number;
  pct: number;
};

type Props = { rows: Row[] };

function colorForScore(score: number): string {
  if (score <= 2) return colors.rojo;
  if (score === 3) return colors.gris;
  return colors.verde;
}

export default function DistribucionRating({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => a.score - b.score);
  const scores = sorted.map((r) => String(r.score));

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 48, right: 16, top: 48, bottom: 32 },
    legend: { show: false },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const p = params[0];
        if (!p) return "";
        const row = sorted[p.dataIndex];
        return (
          `<b>Score ${row.score} — ${row.satisfaccion}</b><br/>` +
          `Reseñas: <b>${row.n.toLocaleString("es-PE")}</b><br/>` +
          `Participación: <b>${row.pct.toFixed(1)}%</b>`
        );
      },
    },
    xAxis: {
      type: "category",
      data: scores,
      axisLabel: {
        fontSize: 12,
        color: "#3d3d3c",
        fontWeight: 600,
      },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => v.toLocaleString("es-PE"),
        fontSize: 10,
        color: colors.gris,
      },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    series: [
      {
        name: "Reseñas",
        type: "bar",
        data: sorted.map((r) => ({
          value: r.n,
          itemStyle: { color: colorForScore(r.score) },
        })),
        barMaxWidth: 56,
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => {
            const row = sorted[p.dataIndex];
            return `${row.pct.toFixed(1)}%`;
          },
          fontSize: 10,
          color: colors.gris,
        },
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
          Distribución de calificaciones
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Frecuencia y participación porcentual por score 1–5
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} notMerge />
    </div>
  );
}
