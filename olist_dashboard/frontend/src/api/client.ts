import { useEffect, useState } from "react";
import { filtersToQuery, useFilters } from "../lib/filters";

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useApi<T>(
  path: string,
  extra: string = "",
  opts?: { sinPeriodo?: boolean }
): ApiState<T> {
  const { filters } = useFilters();
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const qs = filtersToQuery(filters, opts);
  const fullUrl =
    path + qs + (extra ? (qs ? "&" : "?") + extra : "");

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(fullUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [fullUrl]);

  return state;
}
