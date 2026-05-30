import ReactECharts from "echarts-for-react";
import { colors } from "../../../lib/colors";
import { traducir, type Idioma } from "../../../lib/palabras";

type Row = {
  termino: string;
  frecuencia: number;
};

type Props = {
  rows: Row[];
  idioma: Idioma;
  setIdioma: (i: Idioma) => void;
};

export default function PalabrasBar({ rows, idioma, setIdioma }: Props) {
  // Sort descending by frequency, take top 12
  const sorted = [...rows]
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 12);

  // Reverse for horizontal bar (echarts renders bottom-to-top)
  const reversed = [...sorted].reverse();
  const terminos = reversed.map((r) => traducir(r.termino, idioma));

  const option: any = {
    backgroundColor: "transparent",
    grid: { left: 110, right: 56, top: 24, bottom: 32 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const p = params[0];
        if (!p) return "";
        const row = reversed[p.dataIndex];
        const traducido = traducir(row.termino, idioma);
        const original =
          idioma === "es" && traducido !== row.termino
            ? ` <span style="color:${colors.gris};font-size:10px">(pt: ${row.termino})</span>`
            : "";
        return `<b>${traducido}</b>${original}<br/>Frecuencia: <b>${row.frecuencia.toLocaleString("es-PE")}</b>`;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => v.toLocaleString("es-PE"),
        fontSize: 10,
        color: colors.gris,
      },
      splitLine: { lineStyle: { color: "#ecebf1" } },
    },
    yAxis: {
      type: "category",
      data: terminos,
      axisLabel: {
        fontSize: 11,
        color: "#3d3d3c",
        fontStyle: "italic",
      },
      axisLine: { lineStyle: { color: "#d1d0d6" } },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Frecuencia",
        type: "bar",
        data: reversed.map((r) => r.frecuencia),
        itemStyle: { color: colors.rojo },
        barMaxWidth: 28,
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => (p.value as number).toLocaleString("es-PE"),
          fontSize: 9,
          color: colors.gris,
        },
      },
    ],
  };

  const btn = (val: Idioma, label: string) => (
    <button
      onClick={() => setIdioma(val)}
      className={`px-2.5 py-1 transition-colors ${
        idioma === val
          ? "bg-navy text-white"
          : "bg-white text-gray hover:bg-bg"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-ink text-[15px]">
            Palabras más frecuentes en reseñas negativas
          </div>
          <div className="text-[11px] text-gray mt-0.5">
            Top 12 términos por frecuencia de aparición en reseñas score 1–2
          </div>
        </div>
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px] font-medium shrink-0">
          {btn("pt", "Português")}
          {btn("es", "Español")}
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
      <div className="text-[10.5px] text-gray leading-relaxed border-t border-gray-100 pt-2.5">
        Las reseñas de Olist están en <strong className="text-ink">portugués</strong>. Se cuentan
        palabras de ≥ 4 letras en comentarios con score 1–2, descartando palabras vacías
        (<span className="italic">de, que, não, produto…</span>). La frecuencia es el número de
        apariciones de cada término.
        {idioma === "es" && (
          <> El español es una <strong className="text-ink">traducción aproximada</strong>; el original portugués se ve en el tooltip.</>
        )}
      </div>
    </div>
  );
}
