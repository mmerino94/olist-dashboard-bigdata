import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Filters = {
  desde: string | null;
  hasta: string | null;
  region: string | null;
  categoria: string | null;
  estado_pedido: string;
  meses: string[]; // lista de meses YYYY-MM seleccionados (checklist)
};

export type FilterOptions = {
  rango_fechas: { desde: string; hasta: string };
  regiones: string[];
  categorias: string[];
  estados_pedido: string[];
  meses_disponibles: string[];
};

type Ctx = {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  reset: () => void;
  options: FilterOptions | null;
};

const DEFAULTS: Filters = {
  desde: null,
  hasta: null,
  region: null,
  categoria: null,
  estado_pedido: "delivered",
  meses: [],
};

const FiltersCtx = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULTS);
  const [options, setOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    fetch("/api/filtros")
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  const setFilters = (patch: Partial<Filters>) =>
    setFiltersState((prev) => ({ ...prev, ...patch }));

  const reset = () => setFiltersState(DEFAULTS);

  return (
    <FiltersCtx.Provider value={{ filters, setFilters, reset, options }}>
      {children}
    </FiltersCtx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersCtx);
  if (!ctx) throw new Error("useFilters fuera de FiltersProvider");
  return ctx;
}

export function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.desde) params.set("desde", f.desde);
  if (f.hasta) params.set("hasta", f.hasta);
  if (f.region) params.set("region", f.region);
  if (f.categoria) params.set("categoria", f.categoria);
  if (f.estado_pedido) params.set("estado_pedido", f.estado_pedido);
  if (f.meses.length) params.set("meses", f.meses.join(","));
  const s = params.toString();
  return s ? "?" + s : "";
}
