import { colors } from "../../../lib/colors";

type Cat = { flete_pct: number; pct_resenas_malas: number };

const items = [
  {
    nombre: "Estrella",
    color: colors.verde,
    criterio: "flete < 25%  y  reseñas malas < 12%",
    desc: "Rentable y bien valorada: baja carga de flete y clientes contentos.",
    test: (c: Cat) => c.flete_pct < 25 && c.pct_resenas_malas < 12,
  },
  {
    nombre: "Trampa",
    color: colors.rojo,
    criterio: "flete ≥ 35%  y  reseñas malas ≥ 15%",
    desc: "Erosiona margen y genera quejas: el flete se come la rentabilidad.",
    test: (c: Cat) => c.flete_pct >= 35 && c.pct_resenas_malas >= 15,
  },
  {
    nombre: "Resto",
    color: colors.acento,
    criterio: "no cumple ninguno de los dos extremos",
    desc: "Categorías intermedias, sin un patrón claro de estrella ni trampa.",
    test: () => true,
  },
];

export default function DefinicionCategorias({ rows = [] }: { rows?: Cat[] }) {
  // Conteo por tipo (en orden: estrella, trampa, resto; cada categoría cae en uno).
  const conteo = (idx: number) =>
    rows.filter((c) => {
      const esEstrella = items[0].test(c);
      const esTrampa = items[1].test(c);
      if (idx === 0) return esEstrella;
      if (idx === 1) return esTrampa;
      return !esEstrella && !esTrampa;
    }).length;

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-ink text-[15px]">Cómo se define cada categoría</div>
        <div className="text-[11px] text-gray mt-0.5">Según flete sobre precio y % de reseñas malas</div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={it.nombre} className="flex gap-3">
            <span className="mt-1 w-3 h-3 rounded-sm shrink-0" style={{ background: it.color }} />
            <div>
              <div className="text-[13px] font-semibold text-ink">
                {it.nombre}
                {rows.length > 0 && (
                  <span className="text-gray font-normal"> · {conteo(i)} categorías</span>
                )}
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
