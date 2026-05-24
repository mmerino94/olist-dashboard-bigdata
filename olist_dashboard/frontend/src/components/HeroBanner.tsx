// HeroBanner — banner principal de cada vista. Título grande + subtítulo + meta.
import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;     // "P1 · RENTABILIDAD"
  title: string;        // "El 80/20 es suave, y el flete envenena al top"
  subtitle?: string;    // Una línea descriptiva
  children?: ReactNode; // Slot opcional (ej: KPIs del lado derecho)
};

export default function HeroBanner({ eyebrow, title, subtitle, children }: Props) {
  return (
    <header className="border-b border-gray-200 bg-paper">
      <div className="px-8 py-7 flex items-start justify-between gap-8 flex-wrap">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="text-[10.5px] tracking-[0.14em] uppercase text-blue-accent-text font-mono mb-2">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] text-gray mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </header>
  );
}
