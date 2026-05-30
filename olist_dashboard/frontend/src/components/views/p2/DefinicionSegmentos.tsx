import { segmentColors, colors } from "../../../lib/colors";
import { fmtNumber, fmtPct } from "../../../lib/format";

type Seg = { segmento: string; clientes: number; pct_clientes: number; pct_ingreso: number };

const defs = [
  { nombre: "Leales", regla: "compra ≥ 2 veces", desc: "Los que repiten — el oro de la retención." },
  { nombre: "Campeones", regla: "1 compra · reciente + alto gasto", desc: "Recién llegados de alto valor → target #1 de reactivación." },
  { nombre: "Prometedores", regla: "1 compra · reciente + gasto bajo", desc: "Recientes a nutrir para que vuelvan." },
  { nombre: "En riesgo", regla: "1 compra · no reciente + alto gasto", desc: "Gastaron bien pero se están enfriando." },
  { nombre: "Dormidos", regla: "1 compra · no reciente + gasto bajo", desc: "Antiguos de bajo valor, baja prioridad." },
];

export default function DefinicionSegmentos({
  rows = [],
  active = null,
  onSelect,
}: {
  rows?: Seg[];
  active?: string | null;
  onSelect?: (segmento: string) => void;
}) {
  const byName = new Map(rows.map((r) => [r.segmento, r]));

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-ink text-[15px]">Cómo se definen los segmentos</div>
          <div className="text-[11px] text-gray mt-0.5">Clic en un segmento para verlo en la matriz</div>
        </div>
        {active && (
          <button onClick={() => onSelect?.(active)} className="text-[11px] text-blue-accent font-medium shrink-0">
            ✕ ver todos
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {defs.map((d) => {
          const s = byName.get(d.nombre);
          const sel = active === d.nombre;
          return (
            <button
              key={d.nombre}
              onClick={() => onSelect?.(d.nombre)}
              className={`flex gap-3 text-left rounded-md p-2 -m-2 transition-colors ${
                sel ? "bg-bg ring-1 ring-blue-accent/40" : active ? "opacity-50 hover:opacity-100" : "hover:bg-bg"
              }`}
            >
              <span className="mt-1 w-3 h-3 rounded-sm shrink-0" style={{ background: segmentColors[d.nombre] ?? colors.acento }} />
              <div>
                <div className="text-[13px] font-semibold text-ink">
                  {d.nombre}
                  {s && (
                    <span className="text-gray font-normal tabular-nums">
                      {" "}· {fmtNumber(s.clientes)} ({fmtPct(s.pct_clientes)})
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-gray mt-0.5">{d.regla}</div>
                <div className="text-[11.5px] text-ink/75 leading-snug mt-0.5">{d.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 pt-2.5 mt-1">
        <p className="text-[11.5px] text-ink/75 leading-snug">
          <strong>¿Por qué así?</strong> En Olist el 97% compra una sola vez, así que la <strong>Frecuencia</strong> no
          discrimina. Por eso aislamos a los recurrentes (Leales) y segmentamos al resto por{" "}
          <strong>Recencia × Monto</strong>, las dimensiones que sí varían.
        </p>
      </div>
    </div>
  );
}
