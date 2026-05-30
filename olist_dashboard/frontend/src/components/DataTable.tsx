import { useMemo, useState } from "react";

export type Column<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "right";
  format?: (v: any, row: T) => React.ReactNode;
};

export default function DataTable<T extends Record<string, any>>({
  rows, columns, initialSort, maxRows, rowHighlight,
}: { rows: T[]; columns: Column<T>[]; initialSort?: keyof T & string; maxRows?: number; rowHighlight?: (row: T) => boolean }) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort ?? null);
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const r = [...rows];
    if (sortKey) r.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return maxRows ? r.slice(0, maxRows) : r;
  }, [rows, sortKey, dir, maxRows]);

  const toggle = (k: string) => {
    if (sortKey === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setDir("desc"); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((c) => (
              <th key={c.key} onClick={() => toggle(c.key)}
                className={`py-2 px-2 font-mono text-[11px] uppercase tracking-wide text-gray cursor-pointer hover:text-ink ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.label}{sortKey === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            const anyHl = rowHighlight ? sorted.some(rowHighlight) : false;
            return sorted.map((row, i) => {
              const hl = rowHighlight?.(row) ?? false;
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${
                    hl ? "bg-blue-accent/10" : anyHl ? "opacity-40" : "hover:bg-bg"
                  }`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`py-2 px-2 ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}>
                      {c.format ? c.format(row[c.key], row) : String(row[c.key])}
                    </td>
                  ))}
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
}
