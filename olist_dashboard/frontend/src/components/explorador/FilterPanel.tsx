import { useFilters } from "../../lib/filters";
import { cn } from "../../lib/utils";

export default function FilterPanel() {
  const { filters, setFilters, reset, options } = useFilters();

  const regiones = options?.regiones ?? [];
  const categorias = options?.categorias ?? [];

  const activos: { label: string; clear: () => void }[] = [];
  if (filters.region) activos.push({ label: filters.region, clear: () => setFilters({ region: null }) });
  if (filters.categoria) activos.push({ label: filters.categoria, clear: () => setFilters({ categoria: null }) });
  if (filters.estado_pedido !== "delivered")
    activos.push({ label: `Estado: ${filters.estado_pedido}`, clear: () => setFilters({ estado_pedido: "delivered" }) });

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.3fr_1fr_auto] gap-5 items-end">
        {/* Región (single-select como chips) */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Región</div>
          <div className="flex gap-1.5 flex-wrap">
            {regiones.map((r) => {
              const on = filters.region === r;
              return (
                <button
                  key={r}
                  onClick={() => setFilters({ region: on ? null : r })}
                  className={cn(
                    "text-[12.5px] px-3 py-1.5 rounded-full border font-medium transition-colors",
                    on ? "bg-navy text-white border-navy" : "border-gray-200 text-gray hover:border-blue-accent"
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categoría */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Categoría</div>
          <select
            value={filters.categoria ?? ""}
            onChange={(e) => setFilters({ categoria: e.target.value || null })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] bg-paper"
          >
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Estado */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Estado pedido</div>
          <select
            value={filters.estado_pedido}
            onChange={(e) => setFilters({ estado_pedido: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] bg-paper"
          >
            <option value="delivered">Entregados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <button onClick={reset} className="bg-navy text-white rounded-lg px-4 py-2.5 text-[13px] font-medium h-[42px]">
          ↺ Limpiar
        </button>
      </div>

      {activos.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
          <span className="text-[11px] text-gray font-mono">Filtros activos:</span>
          {activos.map((a) => (
            <button key={a.label} onClick={a.clear}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-blue-accent bg-blue-accent/10 px-3 py-1 rounded-full">
              {a.label} <span className="opacity-60">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
