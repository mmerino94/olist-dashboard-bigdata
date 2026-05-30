import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort, fmtNumber } from "../../../lib/format";

type Celda = {
  r_score: number;
  f_bucket: number;
  f_label: string;
  clientes: number;
  monto: number;
  monto_avg: number;
};

export default function MatrizRFM() {
  const { data, loading, error } = useApi<Celda[]>("/api/p2/matriz");
  const cells = data ?? [];
  const maxMonto = Math.max(1, ...cells.map((c) => c.monto));
  const byXY = new Map(cells.map((c) => [`${c.r_score - 1}_${c.f_bucket - 1}`, c]));
  const heat = cells.map((c) => [c.r_score - 1, c.f_bucket - 1, c.monto]);

  const option = {
    grid: { left: 30, right: 12, top: 12, bottom: 54 },
    xAxis: {
      type: "category",
      data: ["1", "2", "3", "4", "5"],
      name: "Recencia (1 antiguo → 5 reciente)",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { fontSize: 10, color: "#71706f" },
      axisLabel: { fontSize: 10, color: "#54595f" },
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: ["1", "2", "3", "4", "5+"],
      name: "Frecuencia",
      nameTextStyle: { fontSize: 10, color: "#71706f" },
      axisLabel: { fontSize: 10, color: "#54595f" },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxMonto,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemWidth: 12,
      itemHeight: 90,
      text: ["+ monto", "0"],
      textStyle: { fontSize: 9, color: "#71706f" },
      inRange: { color: ["#eef2fb", "#9fc2e6", colors.acento, colors.primario] },
      formatter: (v: number) => fmtCurrencyShort(v),
    },
    tooltip: {
      formatter: (p: any) => {
        const c = byXY.get(`${p.data[0]}_${p.data[1]}`);
        if (!c) return "";
        return `R=${c.r_score} · F=${c.f_label}<br/>clientes: ${fmtNumber(c.clientes)}<br/>monto total: ${fmtCurrencyShort(c.monto)}<br/>ticket prom.: ${fmtCurrencyShort(c.monto_avg)}`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: heat,
        label: {
          show: true,
          fontSize: 8.5,
          fontWeight: 600,
          color: "#fff",
          textBorderColor: "rgba(20,22,40,0.65)",
          textBorderWidth: 2.5,
          formatter: (p: any) => fmtCurrencyShort(p.data[2]),
        },
        itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
      },
    ],
  };

  return (
    <PanelCard
      badge="P2 · RETENCIÓN"
      accent={colors.secundario}
      titulo="Matriz RFM · Recencia × Frecuencia"
      meta="color = monto total · la fila F=1 concentra casi todo el dinero"
      to="/retencion"
      toLabel="Profundizar en Retención"
      loading={loading}
      error={error}
      empty={cells.length === 0}
    >
      <ReactECharts option={option} style={{ height: 220 }} notMerge />
    </PanelCard>
  );
}
