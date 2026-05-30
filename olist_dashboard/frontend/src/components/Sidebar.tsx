// Sidebar oscuro estilo McKinsey/BCG — paleta navy del brief de diseño.
// Sin filtros funcionales por ahora (se agregan en Día 5).
import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

type NavItem = { to: string; num: string; label: string; end?: boolean };

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Tablero",
    items: [
      { to: "/", num: "▦", label: "Explorador", end: true },
      { to: "/resumen", num: "0", label: "Resumen ejecutivo" },
    ],
  },
  {
    label: "Análisis por problema",
    items: [
      { to: "/rentabilidad", num: "1", label: "Rentabilidad" },
      { to: "/retencion", num: "2", label: "Retención · RFM" },
      { to: "/logistica", num: "3", label: "Logística" },
      { to: "/vendedores", num: "4", label: "Vendedores" },
      { to: "/satisfaccion", num: "5", label: "Satisfacción" },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-[220px] shrink-0 bg-navy text-white flex flex-col sticky top-0 h-screen">
      {/* Branding */}
      <div className="px-5 py-6 flex flex-col gap-2">
        {/* imagotipo con su proporción original (1091×208) */}
        <img src="/analytics-logo.png" alt="Analytics" className="w-full h-auto block" />
        <div className="leading-none">
          <div className="text-[15px] font-normal tracking-tight leading-tight">
            Olist Brazilian E-Commerce
          </div>
          <div className="text-[10px] tracking-[0.1em] uppercase text-blue-light font-mono mt-1.5">
            Big Data · UNMSM
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-4 flex-1 flex flex-col gap-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-[10px] tracking-[0.14em] uppercase text-white/40 font-mono mb-2 px-3">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    cn(
                      "grid grid-cols-[28px_1fr] items-center px-3 py-2 rounded text-[13px] transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "text-[11px] font-mono",
                          isActive ? "text-blue-light" : "text-white/40"
                        )}
                      >
                        {/^\d+$/.test(it.num) ? `P${it.num}` : it.num}
                      </span>
                      <span className="font-medium">{it.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="text-[10.5px] text-white/45 font-mono">
          112,554 ítems · 2016–2018
        </div>
      </div>
    </aside>
  );
}
