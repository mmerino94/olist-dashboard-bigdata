import { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  badge: string;          // "P1 · RENTABILIDAD"
  accent: string;         // hex del borde superior
  titulo: string;
  meta: string;           // qué codifica el gráfico
  to: string;             // ruta para profundizar
  toLabel: string;        // "Profundizar en Rentabilidad"
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: ReactNode;    // el gráfico
};

export default function PanelCard({
  badge, accent, titulo, meta, to, toLabel, loading, error, empty, children,
}: Props) {
  return (
    <div
      className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col relative overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="text-[10px] font-semibold tracking-[0.07em] font-mono" style={{ color: accent }}>
        {badge}
      </div>
      <h3 className="text-[16px] font-semibold text-ink mt-1 mb-3 leading-tight">{titulo}</h3>

      <div className="flex-1 min-h-[150px]">
        {loading && <div className="h-[150px] flex items-center justify-center text-gray text-sm font-mono">Cargando…</div>}
        {error && <div className="h-[150px] flex items-center justify-center text-bad text-sm font-mono">Error: {error}</div>}
        {!loading && !error && empty && <div className="h-[150px] flex items-center justify-center text-gray text-sm font-mono">Sin datos para este filtro</div>}
        {!loading && !error && !empty && children}
      </div>

      <div className="text-[11px] text-gray mt-2 min-h-[14px]">{meta}</div>
      <Link to={to} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-accent mt-3 hover:underline">
        {toLabel} →
      </Link>
    </div>
  );
}
