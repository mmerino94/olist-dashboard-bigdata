// Hook para cargar snapshots JSON desde /public/data/.
// Reemplaza el viejo useApi() que apuntaba al backend FastAPI.
//
// Uso:
//   const { data, loading, error } = useSnapshot<RowType[]>("p1_rentabilidad_categoria");
//
// Cache de módulo: una vez cargado, no se vuelve a fetchear en la sesión.
import { useEffect, useState } from "react";

const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export type SnapshotState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useSnapshot<T = unknown>(name: string): SnapshotState<T> {
  const [state, setState] = useState<SnapshotState<T>>(() => {
    const cached = cache.get(name);
    if (cached !== undefined) {
      return { data: cached as T, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  useEffect(() => {
    if (cache.has(name)) {
      setState({ data: cache.get(name) as T, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    const existing = inFlight.get(name);
    const promise =
      existing ??
      fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status} cargando ${name}.json`);
          return r.json();
        })
        .then((data) => {
          cache.set(name, data);
          inFlight.delete(name);
          return data;
        })
        .catch((e) => {
          inFlight.delete(name);
          throw e;
        });

    if (!existing) inFlight.set(name, promise);

    promise
      .then((data) => {
        if (!cancelled) setState({ data: data as T, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: e.message });
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return state;
}
