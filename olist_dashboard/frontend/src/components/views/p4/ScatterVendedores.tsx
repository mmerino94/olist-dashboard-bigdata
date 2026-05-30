import ReactECharts from "echarts-for-react";
import { colors, sellerColors } from "../../../lib/colors";

type Row = {
  id_vendedor: string;
  region: string;
  pedidos: number;
  ingreso: number;
  puntualidad: number;
  rating: number;
  clasificacion: string;
};

type Props = { rows: Row[] };

export default function ScatterVendedores({ rows }: Props) {
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso));

  // Ingreso alto threshold = top 25% of ingreso
  const sortedIng = [...rows].map((r) => r.ingreso).sort((a, b) => a - b);
  const ingresoAltoThreshold = sortedIng[Math.floor(sortedIng.length * 0.75)] ?? 0;

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 52, right: 24, top: 48, bottom: 52 },
    legend: {
      top: 8,
      left: 8,
      data: Object.keys(sellerColors),
      textStyle: { fontSize: 10, color: colors.gris },
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      formatter: (p: any) =>
        `<b>${String(p.value[3]).slice(0, 12)}…</b><br/>` +
        `Región: ${p.value[4]}<br/>` +
        `Puntualidad: <b>${p.value[0]}%</b><br/>` +
        `Rating: <b>${p.value[1]}</b><br/>` +
        `Ingreso: <b>R$ ${(p.value[2] as number).toLocaleString("es-PE", { maximumFractionDigits: 0 })}</b>`,
    },
    xAxis: {
      name: "% puntualidad",
      nameLocation: "middle",
      nameGap: 28,
      min: 0,
      max: 100,
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
      axisLabel: {
        formatter: (v: number) => `${v}%`,
        fontSize: 10,
        color: colors.gris,
      },
    },
    yAxis: {
      name: "Rating",
      nameLocation: "middle",
      nameGap: 36,
      min: 0,
      max: 5,
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      splitLine: { lineStyle: { color: "#ecebf1" } },
      axisLabel: {
        formatter: (v: number) => v.toFixed(1),
        fontSize: 10,
        color: colors.gris,
      },
    },
    series: [
      // Zona tóxica: ingreso alto + rating < 3.5 — markArea shaded region
      {
        name: "Zona tóxica",
        type: "scatter",
        data: [],
        markArea: {
          silent: true,
          itemStyle: {
            color: "rgba(168, 66, 58, 0.08)",
            borderColor: "rgba(168, 66, 58, 0.25)",
            borderWidth: 1,
            borderType: "dashed",
          },
          data: [
            [
              { xAxis: 0, yAxis: 0 },
              { xAxis: 100, yAxis: 3.5 },
            ],
          ],
          label: {
            show: true,
            position: "insideTopLeft",
            formatter: "Zona tóxica",
            fontSize: 9,
            color: "rgba(168, 66, 58, 0.7)",
            fontStyle: "italic",
          },
        },
      },
      // One series per clasificacion for legend colors
      ...Object.entries(sellerColors).map(([clasi, color]) => ({
        name: clasi,
        type: "scatter",
        symbolSize: (d: number[]) => 5 + (d[2] / maxIng) * 32,
        data: rows
          .filter((r) => r.clasificacion === clasi)
          .map((r) => ({
            value: [
              Math.round(r.puntualidad * 100),
              r.rating,
              r.ingreso,
              r.id_vendedor,
              r.region,
            ],
            itemStyle: { color, opacity: 0.65 },
          })),
      })),
    ],
  };

  // suppress unused var warning — ingresoAltoThreshold kept for future use
  void ingresoAltoThreshold;

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          Cuadrante de desempeño
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          x: puntualidad · y: rating · tamaño: ingreso · color: clasificación — zona sombreada: rating &lt; 3.5
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 360 }} notMerge />
    </div>
  );
}
