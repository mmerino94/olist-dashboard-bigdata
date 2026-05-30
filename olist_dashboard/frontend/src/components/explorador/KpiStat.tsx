// Tarjeta de KPI ejecutivo: valor + delta (Δ vs periodo) + línea de contexto.
// Pensada para que cada métrica "responda a una problemática" con contexto (rúbrica).
import { cn } from "../../lib/utils";

type Tone = "neutral" | "good" | "warn" | "bad";
const toneCls: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

export type Delta = { pct: number; goodWhenUp?: boolean };

type Props = {
  label: string;
  value: string;
  delta?: Delta | null;
  deltaNote?: string;
  context?: string;
  tone?: Tone;
  loading?: boolean;
};

export default function KpiStat({
  label, value, delta, deltaNote, context, tone = "neutral", loading,
}: Props) {
  const up = delta ? delta.pct >= 0 : false;
  const good = delta ? (delta.goodWhenUp ?? true) === up : false;

  return (
    <div className="bg-paper border border-gray-200 rounded p-4 flex flex-col gap-1 min-h-[108px]">
      <div className="text-[10.5px] tracking-[0.08em] uppercase text-gray font-mono leading-tight">
        {label}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn("text-2xl font-semibold tracking-tight tabular-nums leading-none", toneCls[tone])}>
          {loading ? "…" : value}
        </span>
        {delta && !loading && (
          <span className={cn("text-[12px] font-semibold tabular-nums", good ? "text-good" : "text-bad")}>
            {up ? "▲" : "▼"} {Math.abs(delta.pct).toFixed(1)}%
            {deltaNote && <span className="text-gray font-normal"> {deltaNote}</span>}
          </span>
        )}
      </div>
      {context && (
        <div className="text-[11px] text-gray leading-snug mt-0.5">
          {loading ? "" : context}
        </div>
      )}
    </div>
  );
}
