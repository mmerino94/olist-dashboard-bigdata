import { colors } from "../../../lib/colors";
import { fmtNumber, fmtCurrencyShort } from "../../../lib/format";

type Cat = { flete_pct: number; pedidos: number; flete_total: number };

export const bandItems = [
  { key: "estrella", nombre: "Estrella", color: colors.verde, criterio: "flete < 25%", desc: "Rentable: el flete pesa poco sobre el precio, el margen se conserva.", test: (c: Cat) => c.flete_pct < 25 },
  { key: "trampa", nombre: "Trampa", color: colors.rojo, criterio: "flete ≥ 35%", desc: "El flete se come el margen — sobre todo en las categorías de mucho ingreso.", test: (c: Cat) => c.flete_pct >= 35 },
  { key: "resto", nombre: "Resto", color: colors.acento, criterio: "flete entre 25% y 35%", desc: "Carga de flete intermedia, sin un patrón claro.", test: (c: Cat) => c.flete_pct >= 25 && c.flete_pct < 35 },
];

type Props = { rows?: Cat[]; active?: string | null; onSelect?: (key: string) => void };

export default function DefinicionCategorias({ rows = [], active = null, onSelect }: Props) {
  const stats = (idx: number) => {
    const sel = rows.filter(bandItems[idx].test);
    return {
      categorias: sel.length,
      pedidos: sel.reduce((a, c) => a + c.pedidos, 0),
      flete: sel.reduce((a, c) => a + (c.flete_total ?? 0), 0),
    };
  };

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-ink text-[15px]">Cómo se define cada categoría</div>
          <div className="text-[11px] text-gray mt-0.5">Clic en una banda para filtrar la vista</div>
        </div>
        {active && (
          <button onClick={() => onSelect?.(active)} className="text-[11px] text-blue-accent font-medium shrink-0">
            ✕ ver todas
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {bandItems.map((it, i) => {
          const s = stats(i);
          const sel = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect?.(it.key)}
              className={`flex gap-3 text-left rounded-md p-2 -m-2 transition-colors ${
                sel ? "bg-bg ring-1 ring-blue-accent/40" : active ? "opacity-50 hover:opacity-100" : "hover:bg-bg"
              }`}
            >
              <span className="mt-1 w-3 h-3 rounded-sm shrink-0" style={{ background: it.color }} />
              <div>
                <div className="text-[13px] font-semibold text-ink">{it.nombre}</div>
                <div className="text-[11px] font-mono text-gray mt-0.5">{it.criterio}</div>
                <div className="text-[11.5px] text-ink/75 leading-snug mt-0.5">{it.desc}</div>
                {rows.length > 0 && (
                  <div className="text-[11px] text-ink mt-1 tabular-nums">
                    <span className="font-semibold">{s.categorias}</span> categorías ·{" "}
                    <span className="font-semibold">{fmtNumber(s.pedidos)}</span> pedidos ·{" "}
                    <span className="font-semibold" style={{ color: it.color }}>{fmtCurrencyShort(s.flete)}</span> en flete
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 pt-2.5 mt-1">
        <div className="text-[10px] font-mono uppercase tracking-wide text-gray mb-1">¿Qué es el flete sobre precio?</div>
        <p className="text-[11.5px] text-ink/75 leading-snug">
          Es cuánto representa el <strong>costo de envío</strong> respecto al <strong>precio del producto</strong>.
          Un flete del <strong>35%</strong> significa que por cada R$100 de producto se pagan R$35 de envío — eso
          erosiona el margen de la categoría.
        </p>
      </div>
    </div>
  );
}
