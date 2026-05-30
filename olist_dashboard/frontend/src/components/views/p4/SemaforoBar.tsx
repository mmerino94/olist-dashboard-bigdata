import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";

type Row = {
  clasificacion: string;
  vendedores: number;
  ingreso: number;
  rating_avg: number;
  puntualidad_avg: number;
  pct_vendedores: number;
  pct_ingreso: number;
};

type Props = { rows: Row[] };

// Canonical order: best → worst
const ORDEN: string[] = ["Elite", "Estándar", "En observación", "Crítico"];

export default function SemaforoBar({ rows }: Props) {
  // Sort by canonical order
  const sorted = ORDEN.map((o) => rows.find((r) => r.clasificacion === o)).filter(
    Boolean
  ) as Row[];

  const clasifs = sorted.map((r) => r.clasificacion);

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 110, right: 32, top: 48, bottom: 32 },
    legend: {
      top: 8,
      right: 8,
      data: ["% vendedores", "% ingreso"],
      textStyle: { fontSize: 11, color: colors.gris },
      itemWidth: 12,
      itemHeight: 12,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const name = params[0]?.name ?? "";
        const row = sorted.find((r) => r.clasificacion === name);
        if (!row) return "";
        return (
          `<b>${name}</b><br/>` +
          params
            .map(
              (p: any) =>
                `${p.marker}${p.seriesName}: <b>${(p.value as number).toFixed(1)}%</b>`
            )
            .join("<br/>") +
          `<br/><span style="font-size:10px;color:${colors.gris}">` +
          `Vendedores: ${row.vendedores} · Rating avg: ${row.rating_avg.toFixed(2)}</span>`
        );
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        formatter: (v: number) => `${v}%`,
        fontSize: 10,
        color: colors.gris,
      },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      type: "category",
      data: clasifs,
      axisLabel: { fontSize: 11, color: "#3d3d3c" },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    series: [
      {
        name: "% vendedores",
        type: "bar",
        itemStyle: { color: colors.acento },
        data: sorted.map((r) => r.pct_vendedores),
        barGap: "10%",
        barMaxWidth: 22,
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => `${(p.value as number).toFixed(1)}%`,
          fontSize: 9,
          color: colors.gris,
        },
      },
      {
        name: "% ingreso",
        type: "bar",
        itemStyle: { color: colors.primario },
        data: sorted.map((r) => r.pct_ingreso),
        barMaxWidth: 22,
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => `${(p.value as number).toFixed(1)}%`,
          fontSize: 9,
          color: colors.gris,
        },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">
          ¿Cuántos vendedores vs cuánto ingreso aporta cada nivel?
        </div>
        <div className="text-[11px] text-gray mt-0.5">
          Por nivel: <span style={{ color: colors.acento }}>● % de vendedores</span> que agrupa
          vs <span style={{ color: colors.primario }}>● % del ingreso</span> que genera
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
      <div className="text-[10.5px] text-gray leading-relaxed border-t border-gray-100 pt-2.5">
        <strong className="text-ink">Cómo leerlo:</strong> compara las dos barras dentro de cada
        nivel. Si la barra de <span style={{ color: colors.primario }}>ingreso</span> supera a la
        de <span style={{ color: colors.acento }}>vendedores</span>, ese nivel factura más de lo
        que pesa en número — y al revés. La brecha en <strong className="text-ink">Crítico</strong>{" "}
        mide el ingreso en riesgo.
      </div>
    </div>
  );
}
