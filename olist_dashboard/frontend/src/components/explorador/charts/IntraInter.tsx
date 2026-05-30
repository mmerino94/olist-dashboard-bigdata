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
    grid: { left: 88, right: 82, top: 8, bottom: 6 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: "{value} d", fontSize: 9, color: "#71706f" },
      splitLine: { lineStyle: { color: "#f2f1f6" } },
    },
    yAxis: {
      type: "category",
      data: ["Mismo estado", "Otro estado"],
      axisLabel: { fontSize: 11, color: "#1e2230", fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const esMismo = ps[0].dataIndex === 0;
        const r = esMismo ? intra : inter;
        if (!r) return "";
        const nombre = esMismo ? "Mismo estado" : "Otro estado";
        return `<b>${nombre}</b><br/>${fmtNumber(r.pedidos)} pedidos<br/>entrega: ${r.dias_entrega_avg} días<br/>puntual: ${r.pct_puntual}%<br/>retraso crítico: ${r.pct_retraso_critico}%`;
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
          show: true,
          position: "right",
          formatter: (p: any) => {
            const r = p.dataIndex === 0 ? intra : inter;
            return `{d|${p.value} días}\n{v|${fmtNumber(r?.pedidos ?? 0)} ventas}`;
          },
          rich: {
            d: { fontSize: 11.5, fontWeight: 700, color: "#1e2230" },
            v: { fontSize: 9.5, color: "#71706f", padding: [2, 0, 0, 0] },
          },
        },
      },
    ],
  };

  // Verde = Mismo estado, ámbar = Otro estado (mismos colores que las barras).
  const Comp = ({ label, a, b }: { label: string; a: string; b: string }) => (
    <div className="text-center">
      <div className="text-[10px] text-gray font-mono uppercase tracking-wide">{label}</div>
      <div className="text-[12px] mt-0.5">
        <span className="text-good font-semibold">{a}</span>
        <span className="text-gray"> vs </span>
        <span className="text-warn font-semibold">{b}</span>
      </div>
    </div>
  );

  return (
    <PanelCard
      badge="P3 · LOGÍSTICA"
      accent={colors.acento}
      titulo="Mismo estado vs Otro estado"
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
          <Comp label="% puntual" a={`${intra.pct_puntual}%`} b={`${inter.pct_puntual}%`} />
          <Comp label="% retraso crítico" a={`${intra.pct_retraso_critico}%`} b={`${inter.pct_retraso_critico}%`} />
        </div>
      )}
    </PanelCard>
  );
}
