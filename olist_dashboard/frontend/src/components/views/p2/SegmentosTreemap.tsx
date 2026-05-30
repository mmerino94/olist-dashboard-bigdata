import ReactECharts from "echarts-for-react";
import { colors, segmentColors } from "../../../lib/colors";
import { fmtCurrencyShort, fmtNumber } from "../../../lib/format";

type Seg = {
  segmento: string;
  ingreso: number;
  pct_ingreso: number;
  clientes: number;
  pct_clientes: number;
};

type Props = { rows: Seg[]; active?: string | null; onSelect?: (s: string) => void };

export default function SegmentosTreemap({ rows, active = null, onSelect }: Props) {
  const option: any = {
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.name}</b><br/>ingreso: ${fmtCurrencyShort(p.value)} (${p.data.pct}%)<br/>clientes: ${fmtNumber(p.data.clientes)} (${p.data.pctCli}%)`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          overflow: "break",
          formatter: (p: any) =>
            `{n|${p.name}}\n{v|${p.data.pct}% · ${fmtCurrencyShort(p.value)}}\n{c|${fmtNumber(p.data.clientes)} clientes}`,
          rich: {
            n: { fontSize: 12.5, fontWeight: 700, color: "#fff", lineHeight: 16 },
            v: { fontSize: 10, color: "rgba(255,255,255,0.92)", lineHeight: 14 },
            c: { fontSize: 9.5, color: "rgba(255,255,255,0.8)", lineHeight: 13 },
          },
        },
        itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
        data: rows.map((s) => ({
          name: s.segmento,
          value: s.ingreso,
          pct: s.pct_ingreso,
          clientes: s.clientes,
          pctCli: s.pct_clientes,
          itemStyle: {
            color: segmentColors[s.segmento] ?? colors.acento,
            opacity: active && active !== s.segmento ? 0.28 : 1,
          },
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
          Área proporcional al ingreso · etiqueta: % ingreso · monto · clientes
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 340 }}
        notMerge
        onEvents={{ click: (p: any) => p.name && onSelect?.(p.name) }}
      />
    </div>
  );
}
