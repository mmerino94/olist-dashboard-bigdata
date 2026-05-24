export function fmtCurrency(v: number | null | undefined, currency = "BRL"): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

/** Versión compacta para KPIs grandes: R$ 15.4M, R$ 220k, R$ 350. */
export function fmtCurrencyShort(v: number | null | undefined): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `R$ ${Math.round(v / 1_000)}k`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${Math.round(v)}`;
}

export function fmtNumber(v: number | null | undefined, digits = 0): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return "—";
  return `${v.toFixed(digits)}%`;
}

export function fmtDays(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)} días`;
}

export function fmtRating(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} / 5`;
}
