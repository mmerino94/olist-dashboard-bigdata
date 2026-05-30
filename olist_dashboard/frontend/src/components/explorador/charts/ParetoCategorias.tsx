import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Cat = { categoria: string; pct_ingreso: number; pct_acumulado: number };

const corta = (s: string) => (s.length > 16 ? s.slice(0, 15) + "…" : s);

export default function ParetoCategorias() {
  const { data, loading, error } = useApi<Cat[]>("/api/p1/categorias");
  const top = [...(data ?? [])].sort((a, b) => b.pct_ingreso - a.pct_ingreso).slice(0, 8).reverse();

  const option = {
    grid: { left: 96, right: 30, top: 10, bottom: 22 },
    xAxis: [
      {
        type: "value",
        axisLine: { lineStyle: { color: "#d1d0d6" } },
        axisLabel: { fontSize: 9, color: "#71706f", formatter: "{value}%" },
        splitLine: { lineStyle: { color: "#f2f1f6" } },
      },
      { type: "value", min: 0, max: 100, show: false },
    ],
    yAxis: {
      type: "category",
      data: top.map((r) => corta(r.categoria)),
      axisLabel: { fontSize: 9.5, color: "#54595f" },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const r = top[ps[0].dataIndex];
        return `<b>${r.categoria}</b><br/>% ingreso: ${r.pct_ingreso.toFixed(1)}%<br/>% acumulado: ${r.pct_acumulado.toFixed(1)}%`;
      },
    },
    series: [
      {
        name: "% ingreso",
        type: "bar",
        xAxisIndex: 0,
        data: top.map((r) => r.pct_ingreso),
        itemStyle: { color: colors.acento },
        barWidth: "62%",
        label: { show: true, position: "right", fontSize: 9, color: "#54595f", formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
      {
        name: "% acumulado",
        type: "line",
        xAxisIndex: 1,
        data: top.map((r) => r.pct_acumulado),
        lineStyle: { color: colors.amarillo, width: 2 },
        itemStyle: { color: colors.amarillo },
        symbol: "circle",
        symbolSize: 4,
      },
    ],
  };

  return (
    <PanelCard
      badge="P1 · RENTABILIDAD"
      accent={colors.primario}
      titulo="Pareto de categorías"
      meta="top 8 por % ingreso · línea ámbar = % acumulado"
      to="/rentabilidad"
      toLabel="Profundizar en Rentabilidad"
      loading={loading}
      error={error}
      empty={top.length === 0}
    >
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
    </PanelCard>
  );
}
