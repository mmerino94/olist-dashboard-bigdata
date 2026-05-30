import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Dist = { score: number; satisfaccion: string; n: number; pct: number };
type P5 = { distribucion: Dist[]; nps_estimado: number; total_resenas: number };

export default function BalanceSatisfaccion() {
  const { data, loading, error } = useApi<P5>("/api/p5/distribucion");
  const dist = data?.distribucion ?? [];
  const nps = data?.nps_estimado ?? 0;

  const sum = (pred: (d: Dist) => boolean) =>
    Math.round(dist.filter(pred).reduce((a, d) => a + d.pct, 0) * 10) / 10;
  const malas = sum((d) => d.score <= 2);
  const regular = sum((d) => d.score === 3);
  const buenas = sum((d) => d.score >= 4);

  const option = {
    grid: { left: 8, right: 8, top: 8, bottom: 70 },
    xAxis: { type: "value", max: 100, show: false },
    yAxis: { type: "category", data: ["Reseñas"], show: false },
    tooltip: { trigger: "item" },
    series: [
      { name: "Malas", type: "bar", stack: "x", data: [malas], itemStyle: { color: colors.rojo }, label: { show: true, formatter: `${malas}%`, color: "#fff" } },
      { name: "Regular", type: "bar", stack: "x", data: [regular], itemStyle: { color: colors.gris } },
      { name: "Buenas", type: "bar", stack: "x", data: [buenas], itemStyle: { color: colors.verde }, label: { show: true, formatter: `${buenas}%`, color: "#fff" } },
      {
        type: "gauge", center: ["50%", "118%"], radius: "115%",
        startAngle: 180, endAngle: 0, min: -100, max: 100, splitNumber: 4,
        progress: { show: true, width: 12, itemStyle: { color: colors.amarillo } },
        axisLine: { lineStyle: { width: 12, color: [[1, "#ecebf1"]] } },
        axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false }, pointer: { show: false },
        detail: { valueAnimation: true, offset: [0, -18], fontSize: 22, fontWeight: 700, color: colors.primario, formatter: "NPS {value}" },
        data: [{ value: nps }],
      },
    ],
  };

  return (
    <PanelCard
      badge="P5 · SATISFACCIÓN" accent={colors.amarillo}
      titulo="Balance de reseñas + NPS" meta="negativas / neutras / positivas + NPS estimado"
      to="/satisfaccion" toLabel="Profundizar en Satisfacción"
      loading={loading} error={error} empty={dist.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
