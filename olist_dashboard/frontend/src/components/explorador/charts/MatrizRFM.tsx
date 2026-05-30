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
  // Cada celda elige el color de su etiqueta según qué tan oscuro es su fondo.
  const heat = cells.map((c) => {
    const oscura = c.monto > maxMonto * 0.5;
    return {
      value: [c.r_score - 1, c.f_bucket - 1, c.monto],
      label: {
        color: oscura ? "#fff" : "#1e2230",
        textBorderColor: oscura ? "rgba(20,22,40,0.6)" : "rgba(255,255,255,0.95)",
        textBorderWidth: 2,
      },
    };
  });

  const option = {
    grid: { left: 30, right: 12, top: 12, bottom: 38 },
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
      show: false, // leyenda renderizada como HTML debajo del gráfico
      inRange: { color: ["#eef2fb", "#9fc2e6", colors.acento, colors.primario] },
    },
    tooltip: {
      formatter: (p: any) => {
        const c = byXY.get(`${p.value[0]}_${p.value[1]}`);
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
          formatter: (p: any) => fmtCurrencyShort(p.value[2]),
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
      <ReactECharts option={option} style={{ height: 210 }} notMerge />
      <div className="flex items-center justify-center gap-2 mt-1 text-[9px] text-gray font-mono">
        <span>menos monto</span>
        <span
          className="h-2 w-28 rounded"
          style={{ background: "linear-gradient(90deg,#eef2fb,#9fc2e6,#3c78bb,#27295a)" }}
        />
        <span>más</span>
      </div>
    </PanelCard>
  );
}
