import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "../api/client";
import ChartCard, { Loading, PageTitle } from "../components/ChartCard";
import KpiCard from "../components/KpiCard";
import { colors, ratingColors } from "../lib/colors";
import { fmtNumber, fmtPct } from "../lib/format";
import { palabraEs } from "../lib/translate";

type Distribucion = {
  distribucion: {
    score: number;
    satisfaccion: string;
    n: number;
    pct: number;
  }[];
  nps_estimado: number;
  total_resenas: number;
};

type Mes = {
  periodo: string;
  rating: number;
  resenas: number;
  pct_malas: number;
};

type Palabra = { termino: string; frecuencia: number };

export default function Satisfaccion() {
  const dist = useApi<Distribucion>("/api/p5/distribucion");
  const evol = useApi<Mes[]>("/api/p5/evolucion");
  const negs = useApi<Palabra[]>(
    "/api/p5/palabras",
    "tipo=negativas&top=20"
  );
  const pos = useApi<Palabra[]>(
    "/api/p5/palabras",
    "tipo=positivas&top=20"
  );

  const totalMalas =
    dist.data?.distribucion
      .filter((d) => d.satisfaccion === "Mala")
      .reduce((a, d) => a + d.n, 0) ?? 0;
  const pctMalas = dist.data ? (totalMalas / dist.data.total_resenas) * 100 : 0;

  return (
    <div>
      <PageTitle
        problema="P5 · Causas de insatisfacción"
        titulo="No entendemos por qué los clientes se quejan"
        intro="Distribución de scores, evolución mensual de la satisfacción y análisis de texto sobre las palabras más frecuentes en reseñas negativas y positivas."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total reseñas"
          value={fmtNumber(dist.data?.total_resenas)}
        />
        <KpiCard
          label="NPS estimado"
          value={dist.data ? dist.data.nps_estimado.toFixed(1) : "—"}
          unit="puntos"
          tone={
            dist.data && dist.data.nps_estimado >= 50
              ? "good"
              : dist.data && dist.data.nps_estimado >= 30
              ? "warn"
              : "bad"
          }
          hint="% promotores − % detractores"
        />
        <KpiCard
          label="% Reseñas malas (1-2)"
          value={fmtPct(pctMalas)}
          tone={pctMalas <= 10 ? "good" : pctMalas <= 15 ? "warn" : "bad"}
        />
        <KpiCard
          label="% 5 estrellas"
          value={fmtPct(
            dist.data?.distribucion.find((d) => d.score === 5)?.pct
          )}
          tone="good"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Distribución de puntuaciones"
          subtitle="¿Dónde se concentra el feedback?"
          height={320}
        >
          {dist.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart data={dist.data?.distribucion ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number, _name, item) => {
                    const pct = (item as { payload?: { pct: number } })?.payload?.pct;
                    return `${fmtNumber(v)}${pct != null ? ` (${fmtPct(pct)})` : ""}`;
                  }}
                />
                <Bar dataKey="n" name="Reseñas" radius={[4, 4, 0, 0]}>
                  {(dist.data?.distribucion ?? []).map((d) => (
                    <Cell
                      key={d.score}
                      fill={ratingColors[d.satisfaccion] ?? "#999"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Evolución mensual del rating"
          subtitle="¿La plataforma está mejorando?"
          height={320}
        >
          {evol.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <LineChart data={evol.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={[3, 5]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke={colors.primario}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="Rating promedio"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WordList
          title="Palabras frecuentes en reseñas negativas (1-2)"
          color={colors.rojo}
          data={negs.data ?? []}
          loading={negs.loading}
        />
        <WordList
          title="Palabras frecuentes en reseñas positivas (5)"
          color={colors.secundario}
          data={pos.data ?? []}
          loading={pos.loading}
        />
      </section>
    </div>
  );
}

function WordList({
  title,
  color,
  data,
  loading,
}: {
  title: string;
  color: string;
  data: Palabra[];
  loading: boolean;
}) {
  if (loading)
    return (
      <div className="bg-white rounded-lg p-5 h-72 flex items-center justify-center text-gray-400">
        Cargando…
      </div>
    );

  const max = Math.max(...data.map((d) => d.frecuencia), 1);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h3 className="text-base font-bold text-grisTexto mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-3 italic">
        Reseñas originales en portugués · traducción aproximada al español
      </p>
      <div className="flex flex-wrap gap-2">
        {data.map((w) => {
          const scale = 0.85 + (w.frecuencia / max) * 1.5;
          const traducida = palabraEs(w.termino);
          return (
            <span
              key={w.termino}
              className="inline-block px-3 py-1 rounded-full text-white font-semibold"
              style={{
                backgroundColor: color,
                fontSize: `${scale * 0.9}rem`,
                opacity: 0.5 + (w.frecuencia / max) * 0.5,
              }}
              title={`${w.termino} (PT) · ${w.frecuencia} apariciones`}
            >
              {traducida}
            </span>
          );
        })}
      </div>
    </div>
  );
}
