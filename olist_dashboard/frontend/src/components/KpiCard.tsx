type Props = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-primario",
  good: "text-secundario",
  warn: "text-acento",
  bad: "text-critico",
};

export default function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col min-h-[140px] overflow-hidden">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="flex-1 flex items-center">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap min-w-0">
          <span
            className={`text-2xl md:text-3xl xl:text-[2rem] font-bold tabular-nums tracking-tight leading-none ${toneClass[tone]}`}
            title={value}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm font-normal text-gray-400 leading-none">
              {unit}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-500 leading-snug line-clamp-2 min-h-[2em]">
        {hint ?? ""}
      </div>
    </div>
  );
}
