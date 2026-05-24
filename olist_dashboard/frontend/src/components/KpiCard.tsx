// KpiCard — número grande + label + hint opcional. Estilo corporativo sobrio
// (paleta navy/blue-accent del brief de diseño).
import { cn } from "../lib/utils";

type Tone = "neutral" | "good" | "warn" | "bad";
type Size = "sm" | "md" | "lg";

type Props = {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  hint?: string;
  tone?: Tone;
  size?: Size;
};

const toneClasses: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-5xl",
};

export default function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  size = "md",
}: Props) {
  const displayValue =
    value == null || value === "" ? "—" : value;

  return (
    <div className="bg-paper border border-gray-200 rounded p-4 flex flex-col gap-1.5 min-h-[110px]">
      <div className="text-[10.5px] tracking-[0.1em] uppercase text-gray font-mono">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-semibold tracking-tight tabular-nums leading-none",
            sizeClasses[size],
            toneClasses[tone]
          )}
        >
          {displayValue}
        </span>
        {unit && (
          <span className="text-sm text-gray font-mono">{unit}</span>
        )}
      </div>
      {hint && (
        <div className="text-[11.5px] text-gray leading-snug mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}
