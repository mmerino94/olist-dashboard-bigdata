import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useApi } from "../../../api/client";
import { colors, segmentColors } from "../../../lib/colors";
import { fmtCurrencyShort, fmtNumber } from "../../../lib/format";

type Celda = { r_score: number; f_bucket: number; f_label: string; clientes: number; monto: number; monto_avg: number };
type Seg = { segmento: string; clientes: number; ingreso: number; pct_clientes: number; pct_ingreso: number; ticket_avg: number };

const kNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

function Estado({ loading, error, empty, h }: { loading: boolean; error: string | null; empty: boolean; h: number }) {
  const txt = loading ? "Cargando…" : error ? `Error: ${error}` : "Sin datos para este filtro";
  return (
    <div className="flex items-center justify-center text-sm font-mono text-gray" style={{ height: h }}>
      {txt}
    </div>
  );
}

export default function RetencionPanel() {
  const mat = useApi<Celda[]>("/api/p2/matriz");
  const seg = useApi<Seg[]>("/api/p2/segmentos");

  // --- Matriz RFM (color = clientes únicos) ---
  const cells = mat.data ?? [];
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

  const matOpt = {
    grid: { left: 30, right: 12, top: 12, bottom: 38 },
    xAxis: {
      type: "category", data: ["1", "2", "3", "4", "5"],
      name: "Recencia (1 antiguo → 5 reciente)", nameLocation: "middle", nameGap: 26,
      nameTextStyle: { fontSize: 10, color: "#71706f" },
      axisLabel: { fontSize: 10, color: "#54595f" }, splitArea: { show: true },
    },
    yAxis: {
      type: "category", data: ["1", "2", "3", "4", "5+"], name: "Frecuencia",
      nameTextStyle: { fontSize: 10, color: "#71706f" },
      axisLabel: { fontSize: 10, color: "#54595f" }, splitArea: { show: true },
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
        label: { show: true, fontSize: 8.5, fontWeight: 600, formatter: (p: any) => kNum(p.value[2]) },
        itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
      },
    ],
  };

  // --- Ranking de segmentos por % ingreso ---
  const segs = [...(seg.data ?? [])].sort((a, b) => a.pct_ingreso - b.pct_ingreso);
  const rankOpt = {
    grid: { left: 84, right: 34, top: 6, bottom: 6 },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%", fontSize: 9, color: "#71706f" }, splitLine: { lineStyle: { color: "#f2f1f6" } } },
    yAxis: {
      type: "category", data: segs.map((s) => s.segmento),
      axisLabel: { fontSize: 10, color: "#54595f" }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const s = segs[ps[0].dataIndex];
        return `<b>${s.segmento}</b><br/>% ingreso: ${s.pct_ingreso}%<br/>clientes: ${fmtNumber(s.clientes)} (${s.pct_clientes}%)<br/>ticket prom.: ${fmtCurrencyShort(s.ticket_avg)}`;
      },
    },
    series: [
      {
        type: "bar", barWidth: "60%",
        data: segs.map((s) => ({ value: s.pct_ingreso, itemStyle: { color: segmentColors[s.segmento] ?? colors.acento } })),
        label: { show: true, position: "right", fontSize: 9.5, fontWeight: 600, color: "#54595f", formatter: (p: any) => `${p.value.toFixed(1)}%` },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${colors.secundario}` }}>
      {/* Encabezado único */}
      <div className="flex items-start justify-between px-5 pt-4 pb-1">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.07em]" style={{ color: colors.secundario }}>
            P2 · RETENCIÓN
          </div>
          <h3 className="text-[17px] font-semibold text-ink mt-0.5 leading-tight">Retención y clientes (RFM)</h3>
        </div>
        <Link to="/retencion" className="text-[13px] font-medium text-blue-accent hover:underline shrink-0 mt-1">
          Profundizar →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-6 gap-y-4 px-5 pb-5">
        {/* Matriz RFM */}
        <div className="lg:col-span-3">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Matriz RFM <span className="text-gray font-normal">· color = clientes únicos</span>
          </div>
          {mat.loading || mat.error || cells.length === 0 ? (
            <Estado loading={mat.loading} error={mat.error} empty={cells.length === 0} h={228} />
          ) : (
            <>
              <ReactECharts option={matOpt} style={{ height: 210 }} notMerge />
              <div className="flex items-center justify-center gap-2 mt-1 text-[9px] text-gray font-mono">
                <span>menos clientes</span>
                <span className="h-2 w-24 rounded" style={{ background: "linear-gradient(90deg,#eef2fb,#9fc2e6,#3c78bb,#27295a)" }} />
                <span>más</span>
              </div>
            </>
          )}
        </div>

        {/* Ranking por segmento */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Ranking por segmento <span className="text-gray font-normal">· % del ingreso</span>
          </div>
          {seg.loading || seg.error || segs.length === 0 ? (
            <Estado loading={seg.loading} error={seg.error} empty={segs.length === 0} h={228} />
          ) : (
            <div className="flex-1 min-h-[228px]">
              <ReactECharts option={rankOpt} style={{ height: "100%" }} notMerge />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
