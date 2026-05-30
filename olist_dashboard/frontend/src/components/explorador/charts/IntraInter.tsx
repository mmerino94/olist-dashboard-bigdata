import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";
import { fmtNumber } from "../../../lib/format";

type Row = {
  tipo: string;
  pedidos: number;
  dias_entrega_avg: number;
  pct_puntual: number;
  pct_retraso_critico: number;
};

export default function IntraInter() {
  const { data, loading, error } = useApi<Row[]>("/api/p3/intra_inter");
  const rows = data ?? [];
  const intra = rows.find((r) => r.tipo === "Intra-estado");
  const inter = rows.find((r) => r.tipo === "Inter-estado");

  const option = {
    grid: { left: 88, right: 50, top: 8, bottom: 6 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: "{value} d", fontSize: 9, color: "#71706f" },
      splitLine: { lineStyle: { color: "#f2f1f6" } },
    },
    yAxis: {
      type: "category",
      data: ["Intra-estado", "Inter-estado"],
      axisLabel: { fontSize: 11, color: "#1e2230", fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const r = ps[0].dataIndex === 0 ? intra : inter;
        if (!r) return "";
        return `<b>${r.tipo}</b><br/>${fmtNumber(r.pedidos)} pedidos<br/>entrega: ${r.dias_entrega_avg} días<br/>puntual: ${r.pct_puntual}%<br/>retraso crítico: ${r.pct_retraso_critico}%`;
      },
    },
    series: [
      {
        type: "bar",
        barWidth: "52%",
        data: [
          { value: intra?.dias_entrega_avg ?? 0, itemStyle: { color: colors.verde } },
          { value: inter?.dias_entrega_avg ?? 0, itemStyle: { color: colors.amarillo } },
        ],
        label: {
          show: true, position: "right", fontSize: 11.5, fontWeight: 700, color: "#1e2230",
          formatter: (p: any) => `${p.value} días`,
        },
      },
    ],
  };

  const Comp = ({ label, a, b, bTone }: { label: string; a: string; b: string; bTone: string }) => (
    <div className="text-center">
      <div className="text-[10px] text-gray font-mono uppercase tracking-wide">{label}</div>
      <div className="text-[12px] mt-0.5">
        <span className="text-good font-semibold">{a}</span>
        <span className="text-gray"> vs </span>
        <span className={`${bTone} font-semibold`}>{b}</span>
      </div>
    </div>
  );

  return (
    <PanelCard
      badge="P3 · LOGÍSTICA"
      accent={colors.acento}
      titulo="Intra-estado vs Inter-estado"
      meta="días de entrega · entregar dentro del estado tarda la mitad"
      to="/logistica"
      toLabel="Profundizar en Logística"
      loading={loading}
      error={error}
      empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 132 }} notMerge />
      {intra && inter && (
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
          <Comp label="% puntual" a={`${intra.pct_puntual}%`} b={`${inter.pct_puntual}%`} bTone="text-warn" />
          <Comp label="% retraso crítico" a={`${intra.pct_retraso_critico}%`} b={`${inter.pct_retraso_critico}%`} bTone="text-bad" />
        </div>
      )}
    </PanelCard>
  );
}
