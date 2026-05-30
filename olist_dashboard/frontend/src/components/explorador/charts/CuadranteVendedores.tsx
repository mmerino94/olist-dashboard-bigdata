import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors, sellerColors } from "../../../lib/colors";

type Sel = { puntualidad: number; rating: number; ingreso: number; clasificacion: string };

export default function CuadranteVendedores() {
  const { data, loading, error } = useApi<Sel[]>("/api/p4/scatter");
  const rows = data ?? [];
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso));

  const option = {
    grid: { left: 36, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "% puntualidad", nameLocation: "middle", nameGap: 22, min: 0, max: 100,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    yAxis: { name: "rating", min: 0, max: 5,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    tooltip: { formatter: (p: any) => `${p.value[3]}<br/>puntualidad: ${p.value[0]}%<br/>rating: ${p.value[1]}` },
    series: [{
      type: "scatter",
      symbolSize: (d: number[]) => 6 + (d[2] / maxIng) * 34,
      data: rows.map((r) => ({
        value: [Math.round(r.puntualidad * 100), r.rating, r.ingreso, r.clasificacion],
        itemStyle: { color: sellerColors[r.clasificacion] ?? colors.gris, opacity: 0.6 },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P4 · VENDEDORES" accent={colors.verde}
      titulo="Cuadrante de desempeño" meta="x: puntualidad · y: rating · tamaño: ingreso · color: semáforo"
      to="/vendedores" toLabel="Profundizar en Vendedores"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
