import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Reg = { region: string; pedidos: number; retraso_avg: number; pct_puntual: number };

// posición aproximada (geográfica) de cada región en una grilla 3x3
const POS: Record<string, string> = {
  "Norte": "col-start-1 row-start-1",
  "Nordeste": "col-start-2 col-span-2 row-start-1",
  "Centro-Oeste": "col-start-1 row-start-2",
  "Sudeste": "col-start-2 col-span-2 row-start-2",
  "Sur": "col-start-2 col-span-2 row-start-3",
};

function colorFor(retraso: number, min: number, max: number) {
  if (max === min) return colors.acento;
  const t = (retraso - min) / (max - min); // 0 rápido → 1 lento
  if (t < 0.34) return "#cddef0";
  if (t < 0.67) return colors.acento;
  return colors.rojo;
}

export default function MapaRegiones() {
  const { data, loading, error } = useApi<Reg[]>("/api/p3/regiones");
  const rows = data ?? [];
  const retrasos = rows.map((r) => r.retraso_avg);
  const min = Math.min(...retrasos, 0), max = Math.max(...retrasos, 1);

  return (
    <PanelCard
      badge="P3 · LOGÍSTICA" accent={colors.acento}
      titulo="Mapa por región (retraso)" meta="color = días de retraso promedio"
      to="/logistica" toLabel="Profundizar en Logística"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 h-[180px]">
        {rows.map((r) => (
          <div key={r.region}
            className={`${POS[r.region] ?? ""} rounded-md flex flex-col items-center justify-center text-center px-1`}
            style={{ background: colorFor(r.retraso_avg, min, max) }}
            title={`${r.region}: retraso ${r.retraso_avg}d · ${r.pct_puntual}% puntual`}
          >
            <span className="text-[12px] font-semibold text-ink">{r.region}</span>
            <span className="text-[10px] text-ink/70 font-mono">{r.retraso_avg}d</span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
