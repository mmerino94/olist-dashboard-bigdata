import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Seg = {
  segmento: string;
  pct_clientes: number;
  pct_ingreso: number;
};

type Props = { rows: Seg[]; active?: string | null; onSelect?: (s: string) => void };

export default function SegmentosBar({ rows, active = null, onSelect }: Props) {
  const segmentos = rows.map((r) => r.segmento);
  const op = (r: Seg) => (active && active !== r.segmento ? 0.28 : 1);

  const option: any = {
    grid: { left: 100, right: 32, top: 40, bottom: 32 },
    legend: {
      top: 8,
      right: 8,
      textStyle: { fontSize: 11, color: colors.gris },
      itemWidth: 12,
      itemHeight: 12,
    },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 11, color: colors.gris },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      type: "category",
      data: segmentos,
      axisLabel: { fontSize: 11, color: "#3d3d3c" },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) =>
        params
          .map((p: any) => `${p.seriesName}: <b>${p.value.toFixed(1)}%</b>`)
          .join("<br/>"),
    },
    series: [
      {
        name: "% clientes",
        type: "bar",
        itemStyle: { color: colors.acento },
        data: rows.map((r) => ({ value: r.pct_clientes, itemStyle: { opacity: op(r) } })),
        barMaxWidth: 20,
        label: { show: true, position: "right", fontSize: 9.5, color: "#54595f", formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
      {
        name: "% ingreso",
        type: "bar",
        itemStyle: { color: colors.primario },
        data: rows.map((r) => ({ value: r.pct_ingreso, itemStyle: { opacity: op(r) } })),
        barMaxWidth: 20,
        label: { show: true, position: "right", fontSize: 9.5, fontWeight: 600, color: "#54595f", formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          % clientes vs % ingreso por segmento
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Revela el desbalance: pocos clientes concentran mucho ingreso
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 320 }}
        notMerge
        onEvents={{ click: (p: any) => rows[p.dataIndex] && onSelect?.(rows[p.dataIndex].segmento) }}
      />
    </div>
  );
}
