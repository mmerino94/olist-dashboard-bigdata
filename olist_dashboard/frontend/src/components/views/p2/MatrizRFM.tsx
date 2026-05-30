import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import { colors } from "../../../lib/colors";
import { fmtCurrencyShort, fmtNumber } from "../../../lib/format";

type Celda = { r_score: number; f_bucket: number; f_label: string; clientes: number; monto: number; monto_avg: number };

const kNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export default function MatrizRFM() {
  const { data, loading, error } = useApi<Celda[]>("/api/p2/matriz");
  const cells = data ?? [];
  const maxCli = Math.max(1, ...cells.map((c) => c.clientes));
  const byXY = new Map(cells.map((c) => [`${c.r_score - 1}_${c.f_bucket - 1}`, c]));
  const heat = cells.map((c) => {
    const oscura = c.clientes > maxCli * 0.5;
    return {
      value: [c.r_score - 1, c.f_bucket - 1, c.clientes],
      label: {
        color: oscura ? "#fff" : "#1e2230",
        textBorderColor: oscura ? "rgba(20,22,40,0.6)" : "rgba(255,255,255,0.95)",
        textBorderWidth: 2,
      },
    };
  });

  const option = {
    grid: { left: 36, right: 14, top: 14, bottom: 42 },
    xAxis: {
      type: "category", data: ["1", "2", "3", "4", "5"],
      name: "Recencia (1 antiguo → 5 reciente)", nameLocation: "middle", nameGap: 28,
      nameTextStyle: { fontSize: 11, color: "#54595f", fontWeight: 600 },
      axisLabel: { fontSize: 11, color: "#54595f" }, splitArea: { show: true },
    },
    yAxis: {
      type: "category", data: ["1", "2", "3", "4", "5+"], name: "Frecuencia",
      nameTextStyle: { fontSize: 11, color: "#54595f", fontWeight: 600 },
      axisLabel: { fontSize: 11, color: "#54595f" }, splitArea: { show: true },
    },
    visualMap: { min: 0, max: maxCli, show: false, inRange: { color: ["#eef2fb", "#9fc2e6", colors.acento, colors.primario] } },
    tooltip: {
      formatter: (p: any) => {
        const c = byXY.get(`${p.value[0]}_${p.value[1]}`);
        if (!c) return "";
        return `R=${c.r_score} · F=${c.f_label}<br/>clientes: ${fmtNumber(c.clientes)}<br/>monto total: ${fmtCurrencyShort(c.monto)}<br/>ticket prom.: ${fmtCurrencyShort(c.monto_avg)}`;
      },
    },
    series: [
      {
        type: "heatmap", data: heat,
        label: { show: true, fontSize: 10, fontWeight: 600, formatter: (p: any) => kNum(p.value[2]) },
        itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5">
      <div className="font-semibold text-ink text-[15px]">Matriz RFM</div>
      <div className="text-[11px] text-gray mt-0.5">Recencia × Frecuencia · color = clientes únicos</div>
      {loading || error || cells.length === 0 ? (
        <div className="flex items-center justify-center text-sm font-mono text-gray" style={{ height: 300 }}>
          {loading ? "Cargando…" : error ? `Error: ${error}` : "Sin datos para este filtro"}
        </div>
      ) : (
        <>
          <ReactECharts option={option} style={{ height: 300 }} notMerge />
          <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-gray font-mono">
            <span>menos clientes</span>
            <span className="h-2 w-28 rounded" style={{ background: "linear-gradient(90deg,#eef2fb,#9fc2e6,#3c78bb,#27295a)" }} />
            <span>más</span>
          </div>
        </>
      )}
    </div>
  );
}
