import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort } from "../../../lib/format";

type Evo = { periodo: string; ingreso: number; pedidos: number };

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const etiqueta = (ym: string) => `${MES[Number(ym.slice(5, 7))]} ${ym.slice(2, 4)}`; // "Ago 18"

export default function TrendIngreso() {
  // Serie completa (sin filtro de período) → tendencia estable de 12 meses;
  // sí reacciona a región / categoría / estado.
  const { data, loading, error } = useApi<Evo[]>("/api/resumen/evolucion", "", { sinPeriodo: true });
  const serie = (data ?? []).filter((r) => r.ingreso).slice(-12);

  const option = {
    grid: { left: 58, right: 18, top: 18, bottom: 28 },
    xAxis: {
      type: "category",
      data: serie.map((r) => etiqueta(r.periodo)),
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisLabel: { color: "#71706f", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#71706f", fontSize: 11, formatter: (v: number) => fmtCurrencyShort(v) },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const p = ps[0];
        const row = serie[p.dataIndex];
        return `<b>${p.axisValue}</b><br/>ingreso: ${fmtCurrencyShort(row.ingreso)}<br/>pedidos: ${row.pedidos.toLocaleString("es-PE")}`;
      },
    },
    series: [
      {
        type: "line",
        data: serie.map((r) => r.ingreso),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: colors.acento, width: 2.5 },
        itemStyle: { color: colors.acento },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(60,120,187,0.22)" },
              { offset: 1, color: "rgba(60,120,187,0.02)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <PanelCard
      badge="P1 · RENTABILIDAD"
      accent={colors.primario}
      titulo="Ingreso mensual · últimos 12 meses"
      meta="tendencia del ingreso (reacciona a región y categoría)"
      to="/rentabilidad"
      toLabel="Profundizar en Rentabilidad"
      loading={loading}
      error={error}
      empty={serie.length === 0}
    >
      <ReactECharts option={option} style={{ height: 230 }} notMerge />
    </PanelCard>
  );
}
