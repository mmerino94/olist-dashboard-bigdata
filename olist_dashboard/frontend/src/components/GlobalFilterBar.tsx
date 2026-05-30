import { useFilters } from "../lib/filters";

const MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const mesCorto = (ym: string) => MES[Number(ym.split("-")[1])];
const mesLargo = (ym: string) => `${mesCorto(ym)} ${ym.split("-")[0]}`;

export default function GlobalFilterBar() {
  const { filters, setFilters, reset, options } = useFilters();

  const regiones = options?.regiones ?? [];
  const categorias = options?.categorias ?? [];
  const disponibles = options?.meses_disponibles ?? [];
  const sel = filters.meses;

  // Agrupar meses disponibles por año.
  const anios = Array.from(new Set(disponibles.map((ym) => ym.split("-")[0]))).sort();
  const mesesDe = (anio: string) => disponibles.filter((ym) => ym.startsWith(anio));

  const toggleMes = (ym: string) =>
    setFilters({ meses: sel.includes(ym) ? sel.filter((x) => x !== ym) : [...sel, ym].sort() });

  const anioCompleto = (anio: string) => mesesDe(anio).every((ym) => sel.includes(ym));
  const toggleAnio = (anio: string) => {
    const ms = mesesDe(anio);
    setFilters({
      meses: anioCompleto(anio)
        ? sel.filter((ym) => !ms.includes(ym))
        : [...new Set([...sel, ...ms])].sort(),
    });
  };

  const activos: { label: string; clear: () => void }[] = [];
  if (sel.length)
    activos.push({
      label: sel.length === 1 ? `Periodo: ${mesLargo(sel[0])}` : `Periodo: ${sel.length} meses`,
      clear: () => setFilters({ meses: [] }),
    });
  if (filters.region)
    activos.push({ label: filters.region, clear: () => setFilters({ region: null }) });
  if (filters.categoria)
    activos.push({ label: filters.categoria, clear: () => setFilters({ categoria: null }) });
  if (filters.estado_pedido !== "delivered")
    activos.push({ label: `Estado: ${filters.estado_pedido}`, clear: () => setFilters({ estado_pedido: "delivered" }) });

  return (
    <div className="bg-paper border-b border-gray-200 px-6 py-3 sticky top-0 z-20">
      <div className="flex flex-wrap items-end gap-3">
        {/* Periodo — checklist de meses */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Periodo</span>
          <details className="relative group">
            <summary className="list-none cursor-pointer select-none border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink flex items-center gap-2 min-w-[150px] [&::-webkit-details-marker]:hidden">
              <span className="flex-1">
                {sel.length === 0 ? "Todo el periodo" : sel.length === 1 ? mesLargo(sel[0]) : `${sel.length} meses`}
              </span>
              <span className="text-gray text-[10px]">▾</span>
            </summary>
            <div className="absolute left-0 mt-1 z-30 bg-paper border border-gray-200 rounded-lg shadow-lg p-3 w-60 max-h-80 overflow-auto">
              {anios.map((anio) => (
                <div key={anio} className="mb-3 last:mb-0">
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-navy"
                      checked={anioCompleto(anio)}
                      onChange={() => toggleAnio(anio)}
                    />
                    Año {anio}
                  </label>
                  <div className="pl-5 mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    {mesesDe(anio).map((ym) => (
                      <label key={ym} className="flex items-center gap-2 text-[12.5px] text-ink/90 cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-accent"
                          checked={sel.includes(ym)}
                          onChange={() => toggleMes(ym)}
                        />
                        {mesCorto(ym)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {sel.length > 0 && (
                <button
                  onClick={() => setFilters({ meses: [] })}
                  className="mt-1 text-[12px] text-blue-accent font-medium"
                >
                  Limpiar selección
                </button>
              )}
            </div>
          </details>
        </div>

        {/* Región */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Región</span>
          <select
            value={filters.region ?? ""}
            onChange={(e) => setFilters({ region: e.target.value || null })}
            className="border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink"
          >
            <option value="">Todas</option>
            {regiones.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Categoría */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Categoría</span>
          <select
            value={filters.categoria ?? ""}
            onChange={(e) => setFilters({ categoria: e.target.value || null })}
            className="border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink"
          >
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Estado pedido */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Estado</span>
          <select
            value={filters.estado_pedido}
            onChange={(e) => setFilters({ estado_pedido: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink"
          >
            <option value="delivered">Entregados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {/* Limpiar */}
        <button
          onClick={reset}
          className="bg-navy text-white rounded px-3 py-1.5 text-[13px] font-medium h-[34px] self-end"
        >
          ↺ Limpiar
        </button>

        {/* Pills de filtros activos */}
        {activos.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap self-end">
            {activos.map((a, i) => (
              <button
                key={i}
                onClick={a.clear}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-accent bg-blue-accent/10 px-2.5 py-1 rounded-full"
              >
                {a.label} <span className="opacity-60">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
