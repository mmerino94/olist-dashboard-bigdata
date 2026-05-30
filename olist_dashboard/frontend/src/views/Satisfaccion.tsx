import { useMemo } from "react";
import { useApi } from "../api/client";
import KpiCard from "../components/KpiCard";
import DistribucionRating from "../components/views/p5/DistribucionRating";
import EvolucionRating from "../components/views/p5/EvolucionRating";
import PalabrasBar from "../components/views/p5/PalabrasBar";
import { fmtNumber, fmtPct } from "../lib/format";

type DistRow = {
  score: number;
  satisfaccion: string;
  n: number;
  pct: number;
};

type DistribucionData = {
  distribucion: DistRow[];
  nps_estimado: number;
  total_resenas: number;
};

type EvolucionRow = {
  anio: number;
  mes: number;
  rating: number;
  resenas: number;
  pct_malas: number;
  periodo: string;
};

type PalabraRow = {
  termino: string;
  frecuencia: number;
};

export default function Satisfaccion() {
  const distribucionApi = useApi<DistribucionData>("/api/p5/distribucion");
  const evolucionApi = useApi<EvolucionRow[]>("/api/p5/evolucion");
  const palabrasApi = useApi<PalabraRow[]>(
    "/api/p5/palabras",
    "tipo=negativas&top=12"
  );

  const distData = distribucionApi.data;
  const distRows: DistRow[] = distData?.distribucion ?? [];
  const evolucionRows: EvolucionRow[] = evolucionApi.data ?? [];
  const palabrasRows: PalabraRow[] = palabrasApi.data ?? [];

  const loading =
    distribucionApi.loading || evolucionApi.loading || palabrasApi.loading;
  const error =
    distribucionApi.error || evolucionApi.error || palabrasApi.error;

  const kpis = useMemo(() => {
    if (!distData) return null;
    const pctPositivas = distRows
      .filter((r) => r.score >= 4)
      .reduce((s, r) => s + r.pct, 0);
    const pctNegativas = distRows
      .filter((r) => r.score <= 2)
      .reduce((s, r) => s + r.pct, 0);
    return {
      totalResenas: distData.total_resenas,
      nps: distData.nps_estimado,
      pctPositivas,
      pctNegativas,
    };
  }, [distData, distRows]);

  // Top negative word for insight subtitle
  const topPalabra = useMemo(() => {
    if (!palabrasRows.length) return "—";
    const top = [...palabrasRows].sort((a, b) => b.frecuencia - a.frecuencia)[0];
    return top?.termino ?? "—";
  }, [palabrasRows]);

  if (loading) {
    return (
      <div className="p-8 text-gray text-sm flex items-center gap-2">
        <span className="animate-spin">⟳</span> Cargando satisfacción…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-bad text-sm">Error al cargar: {error}</div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-mono uppercase tracking-widest text-gray">
          P5 · SATISFACCIÓN
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Satisfacción y causas de insatisfacción
        </h1>
        <p className="text-sm text-gray max-w-2xl leading-relaxed">
          No es "mejorar satisfacción": las quejas se agrupan en causas concretas.{" "}
          <strong className="text-bad">
            La palabra más frecuente en reseñas negativas es "{topPalabra}"
          </strong>{" "}
          — actuar sobre causas raíz específicas mueve el NPS más que campañas genéricas.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Reseñas totales"
          value={kpis ? fmtNumber(kpis.totalResenas) : "—"}
          hint="Total de reseñas en el período seleccionado"
        />
        <KpiCard
          label="NPS estimado"
          value={kpis ? kpis.nps.toFixed(1) : "—"}
          tone="warn"
          hint="Net Promoter Score: % promotores (score 5) − % detractores (score 1–2)"
        />
        <KpiCard
          label="% Positivas"
          value={kpis ? fmtPct(kpis.pctPositivas) : "—"}
          tone="good"
          hint="Reseñas con score 4 o 5"
        />
        <KpiCard
          label="% Negativas"
          value={kpis ? fmtPct(kpis.pctNegativas) : "—"}
          tone="bad"
          hint="Reseñas con score 1 o 2"
        />
      </div>

      {/* Charts grid — 2 cols on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistribucionRating rows={distRows} />
        <EvolucionRating rows={evolucionRows} />
      </div>

      {/* Palabras bar — full width */}
      <PalabrasBar rows={palabrasRows} />
    </div>
  );
}
