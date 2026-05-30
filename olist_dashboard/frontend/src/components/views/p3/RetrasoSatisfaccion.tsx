import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  bucket_retraso: string;
  pedidos: number;
  rating_avg: number;
  pct_malas: number;
};

type Props = { rows: Row[] };

export default function RetrasoSatisfaccion({ rows }: Props) {
  const buckets = rows.map((r) => r.bucket_retraso);

  const option: any = {
    grid: { left: 56, right: 56, top: 48, bottom: 60 },
    legend: {
      top: 8,
      right: 8,
      textStyle: { fontSize: 11, color: colors.gris },
      itemWidth: 12,
      itemHeight: 12,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) =>
        params
          .map((p: any) =>
            p.seriesName === "% reseñas malas"
              ? `${p.seriesName}: <b>${(p.value as number).toFixed(1)}%</b>`
              : `${p.seriesName}: <b>${(p.value as number).toFixed(2)}</b>`
          )
          .join("<br/>"),
    },
    xAxis: {
      type: "category",
      data: buckets,
      axisLabel: {
        fontSize: 10,
        color: colors.gris,
        rotate: 20,
        interval: 0,
      },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    yAxis: [
      {
        type: "value",
        name: "% malas",
        nameTextStyle: { fontSize: 10, color: colors.gris },
        min: 0,
        max: 100,
        axisLabel: {
          formatter: (v: number) => `${v}%`,
          fontSize: 10,
          color: colors.gris,
        },
        splitLine: { lineStyle: { color: "#ecebf1" } },
      },
      {
        type: "value",
        name: "Rating",
        nameTextStyle: { fontSize: 10, color: colors.gris },
        min: 0,
        max: 5,
        axisLabel: {
          formatter: (v: number) => v.toFixed(1),
          fontSize: 10,
          color: colors.gris,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "% reseñas malas",
        type: "bar",
        yAxisIndex: 0,
        data: rows.map((r) => r.pct_malas),
        itemStyle: { color: colors.rojo },
        barMaxWidth: 40,
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => `${(p.value as number).toFixed(0)}%`,
          fontSize: 10,
          fontWeight: 600,
          color: colors.rojo,
        },
      },
      {
        name: "Rating promedio",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((r) => r.rating_avg),
        lineStyle: { color: colors.acento, width: 2 },
        itemStyle: { color: colors.acento },
        symbol: "circle",
        symbolSize: 6,
        smooth: false,
        label: {
          show: true,
          position: "bottom",
          formatter: (p: any) => (p.value as number).toFixed(2),
          fontSize: 10,
          fontWeight: 600,
          color: colors.acento,
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          Satisfacción vs retraso
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          A mayor retraso, mayor % de reseñas malas y menor rating
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
    </div>
  );
}
