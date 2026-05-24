// InsightCard — tarjeta de hallazgo accionable. Usada en Vista 0 (5 cards de los 5 problemas).
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

type Props = {
  problema: string;      // "P1"
  titulo: string;        // "El 80/20 es suave, y el flete envenena al top"
  insight: string;       // "25 categorías con flete > 35% del precio — categorías trampa"
  kpi: ReactNode;        // ej: <span className="text-3xl font-semibold">25/72</span>
  kpiLabel?: string;     // "categorías trampa"
  to: string;            // link a la vista detallada
  accent?: "primary" | "warn" | "bad" | "good";
};

const accentClasses = {
  primary: "border-blue-accent/40",
  warn: "border-warn/40",
  bad: "border-bad/40",
  good: "border-good/40",
};

export default function InsightCard({
  problema,
  titulo,
  insight,
  kpi,
  kpiLabel,
  to,
  accent = "primary",
}: Props) {
  return (
    <NavLink
      to={to}
      className={cn(
        "group bg-paper border border-gray-200 rounded p-5 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-px",
        accentClasses[accent]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] tracking-[0.14em] uppercase text-blue-accent-text font-mono">
          {problema}
        </span>
        <span className="text-gray text-xs font-mono group-hover:text-blue-accent transition-colors">
          ver detalle →
        </span>
      </div>

      <h3 className="text-[15px] font-semibold leading-snug text-ink">
        {titulo}
      </h3>

      <div className="flex items-baseline gap-2 pt-1">
        <div className="text-3xl font-semibold tabular-nums leading-none text-ink">
          {kpi}
        </div>
        {kpiLabel && (
          <div className="text-[11.5px] text-gray font-mono leading-tight">
            {kpiLabel}
          </div>
        )}
      </div>

      <p className="text-[12.5px] text-gray leading-relaxed border-t border-gray-100 pt-3 mt-auto">
        {insight}
      </p>
    </NavLink>
  );
}
