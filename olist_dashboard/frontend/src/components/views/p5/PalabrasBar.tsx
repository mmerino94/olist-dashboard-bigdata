import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  termino: string;
  frecuencia: number;
};

type Props = { rows: Row[] };

export default function PalabrasBar({ rows }: Props) {
  // Sort descending by frequency, take top 12
  const sorted = [...rows]
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 12);

  // Reverse for horizontal bar (echarts renders bottom-to-top)
  const reversed = [...sorted].reverse();
  const terminos = reversed.map((r) => r.termino);

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 90, right: 56, top: 24, bottom: 32 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const p = params[0];
        if (!p) return "";
        return `<b>${p.name}</b><br/>Frecuencia: <b>${(p.value as number).toLocaleString("es-PE")}</b>`;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => v.toLocaleString("es-PE"),
        fontSize: 10,
        color: colors.gris,
      },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      type: "category",
      data: terminos,
      axisLabel: {
        fontSize: 11,
        color: "#3d3d3c",
        fontStyle: "italic",
      },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Frecuencia",
        type: "bar",
        data: reversed.map((r) => r.frecuencia),
        itemStyle: { color: colors.rojo },
        barMaxWidth: 28,
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => (p.value as number).toLocaleString("es-PE"),
          fontSize: 9,
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
          Palabras más frecuentes en reseñas negativas
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Top 12 términos por frecuencia de aparición en reseñas score 1–2
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
    </div>
  );
}
