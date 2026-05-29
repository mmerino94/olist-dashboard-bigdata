import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors, segmentColors } from "../../../lib/colors";

type Seg = { segmento: string; clientes: number; ingreso: number; pct_ingreso: number };

export default function TreemapRFM() {
  const { data, loading, error } = useApi<Seg[]>("/api/p2/segmentos");
  const rows = data ?? [];

  const option = {
    tooltip: { formatter: (p: any) => `<b>${p.name}</b><br/>ingreso: R$${(p.value / 1000).toFixed(0)}k<br/>${p.data.pct}% del ingreso` },
    series: [{
      type: "treemap",
      roam: false, nodeClick: false, breadcrumb: { show: false },
      label: { show: true, formatter: "{b}", color: "#fff", fontSize: 12, fontWeight: 600 },
      itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
      data: rows.map((s) => ({
        name: s.segmento, value: s.ingreso, pct: s.pct_ingreso,
        itemStyle: { color: segmentColors[s.segmento] ?? colors.acento },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P2 · RETENCIÓN" accent={colors.secundario}
      titulo="Treemap de segmentos RFM" meta="área = ingreso del segmento"
      to="/retencion" toLabel="Profundizar en Retención"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
