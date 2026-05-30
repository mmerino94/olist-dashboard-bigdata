import ReactECharts from "echarts-for-react";
import { colors, segmentColors } from "../../../lib/colors";

type Seg = {
  segmento: string;
  ingreso: number;
  pct_ingreso: number;
};

type Props = { rows: Seg[] };

export default function SegmentosTreemap({ rows }: Props) {
  const option: any = {
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.name}</b><br/>ingreso: R$${(p.value / 1000).toFixed(0)}k<br/>${p.data.pct}% del ingreso`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: "{b}",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
        },
        itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
        data: rows.map((s) => ({
          name: s.segmento,
          value: s.ingreso,
          pct: s.pct_ingreso,
          itemStyle: { color: segmentColors[s.segmento] ?? colors.acento },
        })),
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          Segmentos por ingreso (RFM)
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Área proporcional al ingreso del segmento
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
    </div>
  );
}
