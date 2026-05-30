import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  region: string;
  pedidos: number;
  retraso_avg: number;
  pct_puntual: number;
};

type Props = { rows: Row[] };

/** Color severity by pct_puntual: low puntual → rojo, high → claro/verde. */
function colorBySeverity(pct: number): string {
  if (pct >= 93) return colors.claro;
  if (pct >= 90) return colors.acento;
  return colors.rojo;
}

export default function RegionesBar({ rows }: Props) {
  // Sort by pct_puntual ascending so worst region is at top of horizontal bar
  const sorted = [...rows].sort((a, b) => a.pct_puntual - b.pct_puntual);
  const regiones = sorted.map((r) => r.region);

  const option: any = {
    grid: { left: 100, right: 48, top: 40, bottom: 32 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const p = params[0];
        const row = sorted.find((r) => r.region === p.name);
        if (!row) return "";
        return (
          `<b>${p.name}</b><br/>` +
          `% puntual: <b>${row.pct_puntual.toFixed(1)}%</b><br/>` +
          `Retraso avg: <b>${row.retraso_avg.toFixed(1)} d</b><br/>` +
          `Pedidos: <b>${row.pedidos.toLocaleString("es-PE")}</b>`
        );
      },
    },
    xAxis: {
      type: "value",
      min: 80,
      max: 100,
      axisLabel: {
        formatter: (v: number) => `${v}%`,
        fontSize: 10,
        color: colors.gris,
      },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      type: "category",
      data: regiones,
      axisLabel: { fontSize: 11, color: "#3d3d3c" },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    series: [
      {
        name: "% puntual",
        type: "bar",
        data: sorted.map((r) => ({
          value: r.pct_puntual,
          itemStyle: { color: colorBySeverity(r.pct_puntual) },
        })),
        barMaxWidth: 28,
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => `${(p.value as number).toFixed(1)}%`,
          fontSize: 10,
          color: colors.gris,
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          Retraso por región
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          % puntual por región — rojo: bajo rendimiento logístico
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
      <div className="text-[10.5px] text-gray leading-relaxed border-t border-gray-100 pt-2.5">
        <strong className="text-ink">Retraso</strong> = días entre la entrega real y la
        fecha estimada prometida al cliente. Positivo = entregó tarde;{" "}
        <span className="whitespace-nowrap">≤ 0 = puntual</span>.{" "}
        <strong className="text-ink">Retraso crítico</strong> = más de 7 días tarde.
      </div>
    </div>
  );
}
