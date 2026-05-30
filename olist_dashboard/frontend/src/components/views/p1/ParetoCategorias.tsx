import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Cat = {
  categoria: string;
  pct_ingreso: number;
  pct_acumulado: number;
};

type Props = { rows: Cat[] };

export default function ParetoCategorias({ rows }: Props) {
  // Top-10 by pct_ingreso descending
  const top10 = [...rows]
    .sort((a, b) => b.pct_ingreso - a.pct_ingreso)
    .slice(0, 10);

  const categorias = top10.map((r) => r.categoria);
  const pctIngresos = top10.map((r) => r.pct_ingreso);
  const pctAcumulados = top10.map((r) => r.pct_acumulado);

  const option: any = {
    grid: { left: 130, right: 56, top: 16, bottom: 32 },
    xAxis: [
      {
        type: "value",
        name: "% ingreso",
        nameLocation: "middle",
        nameGap: 22,
        axisLine: { lineStyle: { color: "#d1d0d6" } },
        splitLine: { lineStyle: { color: "#ecebf1" } },
      },
      {
        type: "value",
        name: "% acumulado",
        nameLocation: "middle",
        nameGap: 22,
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: "#d1d0d6" } },
        splitLine: { show: false },
      },
    ],
    yAxis: {
      type: "category",
      data: categorias,
      axisLabel: { fontSize: 11 },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const cat = params[0]?.name ?? "";
        let html = `<b>${cat}</b>`;
        params.forEach((p: any) => {
          html += `<br/>${p.seriesName}: ${p.value.toFixed(1)}%`;
        });
        return html;
      },
    },
    legend: { data: ["% ingreso", "% acumulado"], top: 0, right: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        name: "% ingreso",
        type: "bar",
        xAxisIndex: 0,
        data: pctIngresos,
        itemStyle: { color: colors.acento },
        label: { show: true, position: "right", fontSize: 10, formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
      {
        name: "% acumulado",
        type: "line",
        xAxisIndex: 1,
        data: pctAcumulados,
        lineStyle: { color: colors.primario, width: 2.5 },
        itemStyle: { color: colors.primario },
        symbol: "circle",
        symbolSize: 6,
        label: {
          show: true, position: "top", fontSize: 10, fontWeight: 700, color: colors.primario,
          backgroundColor: "rgba(255,255,255,0.9)", padding: [1, 3], borderRadius: 3,
          formatter: (p: any) => `${Math.round(p.value)}%`,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#d1d0d6", type: "dashed" },
          data: [{ xAxis: 80, label: { formatter: "80%", fontSize: 10 } }],
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">Pareto de categorías</div>
        <div className="text-[11px] text-gray mt-0.5">
          Top 10 por % ingreso · línea: % acumulado
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
    </div>
  );
}
