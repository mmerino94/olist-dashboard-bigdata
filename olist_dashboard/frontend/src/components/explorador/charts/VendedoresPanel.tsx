import ReactECharts from "echarts-for-react";
import { Link } from "react-router-dom";
import { useApi } from "../../../api/client";
import { colors, sellerColors } from "../../../lib/colors";
import { fmtCurrencyShort, fmtNumber } from "../../../lib/format";

type Sel = { puntualidad: number; rating: number; ingreso: number; clasificacion: string };
type Semaforo = { clasificacion: string; vendedores: number; pct_vendedores: number; pct_ingreso: number };

function Estado({ loading, error, empty, h }: { loading: boolean; error: string | null; empty: boolean; h: number }) {
  const txt = loading ? "Cargando…" : error ? `Error: ${error}` : "Sin datos para este filtro";
  return (
    <div className="flex items-center justify-center text-sm font-mono text-gray" style={{ height: h }}>
      {txt}
    </div>
  );
}

export default function VendedoresPanel() {
  const sc = useApi<Sel[]>("/api/p4/scatter");
  const sem = useApi<Semaforo[]>("/api/p4/semaforo");

  // --- Cuadrante (burbujas por ingreso) ---
  const rows = sc.data ?? [];
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso));
  const minPunt = rows.length ? Math.min(...rows.map((r) => r.puntualidad * 100)) : 0;
  const xMin = Math.max(0, Math.floor(minPunt / 10) * 10);

  const scatterOpt = {
    grid: { left: 44, right: 22, top: 16, bottom: 40 },
    xAxis: {
      name: "% puntualidad", nameLocation: "middle", nameGap: 26, min: xMin, max: 100,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLabel: { color: "#71706f", fontSize: 10 },
      axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      name: "rating", min: 0, max: 5,
      nameTextStyle: { color: "#54595f", fontSize: 11, fontWeight: 600 },
      axisLabel: { color: "#71706f", fontSize: 10 },
      axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    tooltip: {
      formatter: (p: any) =>
        `${p.value[3]}<br/>puntualidad: ${p.value[0]}%<br/>rating: ${p.value[1]}<br/>ingreso: ${fmtCurrencyShort(p.value[2])}`,
    },
    series: [
      {
        type: "scatter",
        symbolSize: (d: number[]) => 7 + Math.sqrt(d[2] / maxIng) * 54,
        data: rows.map((r) => ({
          value: [Math.round(r.puntualidad * 100), r.rating, r.ingreso, r.clasificacion],
          itemStyle: { color: sellerColors[r.clasificacion] ?? colors.gris, opacity: 0.55, borderColor: "rgba(255,255,255,0.7)", borderWidth: 0.5 },
        })),
      },
    ],
  };

  // --- Ranking de vendedores por nivel (cantidad) ---
  const segs = [...(sem.data ?? [])].sort((a, b) => a.vendedores - b.vendedores);
  const rankOpt = {
    grid: { left: 96, right: 44, top: 6, bottom: 6 },
    xAxis: { type: "value", axisLabel: { fontSize: 9, color: "#71706f" }, splitLine: { lineStyle: { color: "#f2f1f6" } } },
    yAxis: {
      type: "category", data: segs.map((s) => s.clasificacion),
      axisLabel: { fontSize: 10, color: "#54595f" }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#d1d0d6" } },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: any) => {
        const s = segs[ps[0].dataIndex];
        return `<b>${s.clasificacion}</b><br/>${fmtNumber(s.vendedores)} vendedores (${s.pct_vendedores}%)<br/>% ingreso: ${s.pct_ingreso}%`;
      },
    },
    series: [
      {
        type: "bar", barWidth: "58%",
        data: segs.map((s) => ({ value: s.vendedores, itemStyle: { color: sellerColors[s.clasificacion] ?? colors.gris } })),
        label: { show: true, position: "right", fontSize: 10, fontWeight: 600, color: "#54595f", formatter: (p: any) => fmtNumber(p.value) },
      },
    ],
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg overflow-hidden" style={{ borderTop: `3px solid ${colors.verde}` }}>
      <div className="flex items-start justify-between px-5 pt-4 pb-1">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.07em]" style={{ color: colors.verde }}>P4 · VENDEDORES</div>
          <h3 className="text-[17px] font-semibold text-ink mt-0.5 leading-tight">Desempeño de vendedores</h3>
        </div>
        <Link to="/vendedores" className="text-[13px] font-medium text-blue-accent hover:underline shrink-0 mt-1">Profundizar →</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 px-5 pb-5">
        {/* Cuadrante */}
        <div className="lg:col-span-2">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Cuadrante de desempeño <span className="text-gray font-normal">· x puntualidad · y rating</span>
          </div>
          {sc.loading || sc.error || rows.length === 0 ? (
            <Estado loading={sc.loading} error={sc.error} empty={rows.length === 0} h={350} />
          ) : (
            <>
              <ReactECharts option={scatterOpt} style={{ height: 320 }} notMerge />
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray mt-1">
                <span>Tamaño de burbuja = ingreso del vendedor:</span>
                <span className="inline-block rounded-full bg-gray/40" style={{ width: 7, height: 7 }} />
                <span className="inline-block rounded-full bg-gray/40" style={{ width: 13, height: 13 }} />
                <span className="inline-block rounded-full bg-gray/40" style={{ width: 20, height: 20 }} />
                <span>menor → mayor</span>
              </div>
            </>
          )}
        </div>

        {/* Ranking por nivel */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="text-[12px] font-medium text-ink mb-1 border-b border-gray-100 pb-1">
            Vendedores por nivel <span className="text-gray font-normal">· cantidad</span>
          </div>
          {sem.loading || sem.error || segs.length === 0 ? (
            <Estado loading={sem.loading} error={sem.error} empty={segs.length === 0} h={320} />
          ) : (
            <div className="flex-1 min-h-[320px]">
              <ReactECharts option={rankOpt} style={{ height: "100%" }} notMerge />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
