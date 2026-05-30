import { useFilters } from "../lib/filters";

export default function GlobalFilterBar() {
  const { filters, setFilters, reset, options } = useFilters();

  const regiones = options?.regiones ?? [];
  const categorias = options?.categorias ?? [];
  const minDate = options?.rango_fechas.desde ?? "";
  const maxDate = options?.rango_fechas.hasta ?? "";

  const activos: { label: string; clear: () => void }[] = [];
  if (filters.desde)
    activos.push({ label: `Desde: ${filters.desde}`, clear: () => setFilters({ desde: null }) });
  if (filters.hasta)
    activos.push({ label: `Hasta: ${filters.hasta}`, clear: () => setFilters({ hasta: null }) });
  if (filters.region)
    activos.push({ label: filters.region, clear: () => setFilters({ region: null }) });
  if (filters.categoria)
    activos.push({ label: filters.categoria, clear: () => setFilters({ categoria: null }) });
  if (filters.estado_pedido !== "delivered")
    activos.push({ label: `Estado: ${filters.estado_pedido}`, clear: () => setFilters({ estado_pedido: "delivered" }) });

  return (
    <div className="bg-paper border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex flex-wrap items-end gap-3">
        {/* Fecha Desde */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Desde</span>
          <input
            type="date"
            value={filters.desde ?? ""}
            min={minDate}
            max={maxDate}
            onChange={(e) => setFilters({ desde: e.target.value || null })}
            className="border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono">Hasta</span>
          <input
            type="date"
            value={filters.hasta ?? ""}
            min={minDate}
            max={maxDate}
            onChange={(e) => setFilters({ hasta: e.target.value || null })}
            className="border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-paper text-ink"
          />
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
