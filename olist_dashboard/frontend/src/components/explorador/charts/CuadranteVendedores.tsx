import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors, sellerColors } from "../../../lib/colors";
import { fmtCurrencyShort } from "../../../lib/format";

type Sel = { puntualidad: number; rating: number; ingreso: number; clasificacion: string };

export default function CuadranteVendedores() {
  const { data, loading, error } = useApi<Sel[]>("/api/p4/scatter");
  const rows = data ?? [];
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso));

  const option = {
    grid: { left: 44, right: 22, top: 18, bottom: 40 },
    xAxis: {
      name: "% puntualidad", nameLocation: "middle", nameGap: 26, min: 0, max: 100,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLabel: { color: "#71706f", fontSize: 10 },
      axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      name: "rating", min: 0, max: 5,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLabel: { color: "#71706f", fontSize: 10 },
      axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    tooltip: {
      formatter: (p: any) =>
        `${p.value[3]}<br/>puntualidad: ${p.value[0]}%<br/>rating: ${p.value[1]}<br/>ingreso: ${fmtCurrencyShort(p.value[2])}`,
    },
    series: [
      {
        type: "scatter",
        // diámetro ∝ raíz del ingreso → el ÁREA de la burbuja representa el monto
        symbolSize: (d: number[]) => 7 + Math.sqrt(d[2] / maxIng) * 54,
        data: rows.map((r) => ({
          value: [Math.round(r.puntualidad * 100), r.rating, r.ingreso, r.clasificacion],
          itemStyle: {
            color: sellerColors[r.clasificacion] ?? colors.gris,
            opacity: 0.55,
            borderColor: "rgba(255,255,255,0.7)",
            borderWidth: 0.5,
          },
        })),
      },
    ],
  };

  return (
    <PanelCard
      badge="P4 · VENDEDORES" accent={colors.verde}
      titulo="Cuadrante de desempeño" meta="x: puntualidad · y: rating · tamaño de burbuja: ingreso · color: semáforo"
      to="/vendedores" toLabel="Profundizar en Vendedores"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 360 }} notMerge />
    </PanelCard>
  );
}
