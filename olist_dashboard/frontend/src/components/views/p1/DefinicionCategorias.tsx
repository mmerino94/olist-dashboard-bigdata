import { colors } from "../../../lib/colors";

type Cat = { flete_pct: number };

const items = [
  {
    nombre: "Estrella",
    color: colors.verde,
    criterio: "flete < 25%",
    desc: "Rentable: el flete pesa poco sobre el precio, el margen se conserva.",
    test: (c: Cat) => c.flete_pct < 25,
  },
  {
    nombre: "Trampa",
    color: colors.rojo,
    criterio: "flete ≥ 35%",
    desc: "El flete se come el margen — sobre todo en las categorías de mucho ingreso.",
    test: (c: Cat) => c.flete_pct >= 35,
  },
  {
    nombre: "Resto",
    color: colors.acento,
    criterio: "flete entre 25% y 35%",
    desc: "Carga de flete intermedia, sin un patrón claro.",
    test: (c: Cat) => c.flete_pct >= 25 && c.flete_pct < 35,
  },
];

export default function DefinicionCategorias({ rows = [] }: { rows?: Cat[] }) {
  const conteo = (idx: number) => rows.filter(items[idx].test).length;

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">Cómo se define cada categoría</div>
        <div className="text-[11px] text-gray mt-0.5">Según el flete sobre precio</div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={it.nombre} className="flex gap-3">
            <span className="mt-1 w-3 h-3 rounded-sm shrink-0" style={{ background: it.color }} />
            <div>
              <div className="text-[13px] font-semibold text-ink">
                {it.nombre}
                {rows.length > 0 && <span className="text-gray font-normal"> · {conteo(i)} categorías</span>}
              </div>
              <div className="text-[11px] font-mono text-gray mt-0.5">{it.criterio}</div>
              <div className="text-[11.5px] text-ink/75 leading-snug mt-0.5">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
