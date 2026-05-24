import { NavLink } from "react-router-dom";
import { useFilters } from "../lib/filters";
import { categoriaEs } from "../lib/translate";

const navItems = [
  { to: "/", label: "Resumen ejecutivo", end: true },
  { to: "/rentabilidad", label: "P1 · Rentabilidad" },
  { to: "/retencion", label: "P2 · Retención" },
  { to: "/logistica", label: "P3 · Logística" },
  { to: "/vendedores", label: "P4 · Vendedores" },
  { to: "/satisfaccion", label: "P5 · Satisfacción" },
];

export default function Sidebar() {
  const { filters, setFilters, reset, options } = useFilters();

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="text-xs uppercase tracking-wider text-gray-400">
          Big Data Analysis
        </div>
        <div className="text-lg font-bold text-primario">Olist BI Suite</div>
        <div className="text-xs text-gray-500 mt-0.5">
          Caso de estudio para mercado peruano
        </div>
      </div>

      <nav className="px-3 py-4 space-y-0.5">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium transition ${
                isActive
                  ? "bg-primario text-white"
                  : "text-grisTexto hover:bg-grisClaro"
              }`
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-100 mt-auto space-y-3">
        <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
          Filtros globales
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={filters.desde ?? ""}
            min={options?.rango_fechas.desde}
            max={options?.rango_fechas.hasta}
            onChange={(e) =>
              setFilters({ desde: e.target.value || null })
            }
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.hasta ?? ""}
            min={options?.rango_fechas.desde}
            max={options?.rango_fechas.hasta}
            onChange={(e) =>
              setFilters({ hasta: e.target.value || null })
            }
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Región</label>
          <select
            value={filters.region ?? ""}
            onChange={(e) => setFilters({ region: e.target.value || null })}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          >
            <option value="">Todas</option>
            {options?.regiones.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Categoría</label>
          <select
            value={filters.categoria ?? ""}
            onChange={(e) =>
              setFilters({ categoria: e.target.value || null })
            }
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          >
            <option value="">Todas</option>
            {options?.categorias.map((c) => (
              <option key={c} value={c}>
                {categoriaEs(c)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={reset}
          className="w-full text-xs text-primario font-semibold hover:underline mt-1"
        >
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
}
