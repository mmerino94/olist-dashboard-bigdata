import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Cat = {
  categoria: string;
  ingreso_total: number;
  flete_pct: number;
  pct_resenas_malas: number;
};

export default function MatrizRentabilidad() {
  const { data, loading, error } = useApi<Cat[]>("/api/p1/categorias");
  const rows = data ?? [];

  const color = (c: Cat) =>
    c.flete_pct >= 35 && c.pct_resenas_malas >= 15 ? colors.rojo
      : c.flete_pct < 25 && c.pct_resenas_malas < 12 ? colors.verde
      : colors.acento;

  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso_total));
  const option = {
    grid: { left: 44, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "% reseñas malas", nameLocation: "middle", nameGap: 22,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    yAxis: { name: "flete %", axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.value[3]}</b><br/>reseñas malas: ${p.value[0]}%<br/>flete: ${p.value[1]}%<br/>ingreso: R$${(p.value[2] / 1000).toFixed(0)}k`,
    },
    series: [{
      type: "scatter",
      symbolSize: (d: number[]) => 8 + (d[2] / maxIng) * 42,
      data: rows.map((r) => ({
        value: [r.pct_resenas_malas, r.flete_pct, r.ingreso_total, r.categoria],
        itemStyle: { color: color(r), opacity: 0.78 },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P1 · RENTABILIDAD" accent={colors.primario}
      titulo="Matriz estrella / trampa" meta="x: % reseñas malas · y: flete % · tamaño: ingreso"
      to="/rentabilidad" toLabel="Profundizar en Rentabilidad"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
