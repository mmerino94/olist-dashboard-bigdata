import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "../api/client";
import ChartCard, { Loading, PageTitle } from "../components/ChartCard";
import KpiCard from "../components/KpiCard";
import { colors } from "../lib/colors";
import { fmtNumber, fmtPct } from "../lib/format";

type Kpi = {
  pedidos: number;
  tiempo_promedio: number;
  pct_puntual: number;
  retraso_avg_atrasados: number;
  pct_retraso_critico: number;
};

type Ruta = {
  origen: string;
  destino: string;
  origen_region: string;
  destino_region: string;
  pedidos: number;
  dias_entrega_avg: number;
  retraso_avg: number;
  pct_puntual: number;
  pct_retraso_critico: number;
};

type Bucket = {
  bucket_retraso: string;
  pedidos: number;
  rating_avg: number;
  pct_malas: number;
};

export default function Logistica() {
  const kpis = useApi<Kpi>("/api/p3/kpis");
  const rutas = useApi<Ruta[]>("/api/p3/rutas");
  const buckets = useApi<Bucket[]>("/api/p3/satisfaccion_vs_retraso");

  const peores = (rutas.data ?? [])
    .slice()
    .sort((a, b) => a.pct_puntual - b.pct_puntual)
    .slice(0, 10);

  return (
    <div>
      <PageTitle
        problema="P3 · Control de tiempos de entrega"
        titulo="No controlamos los tiempos de entrega y eso nos genera quejas"
        intro="Mapeo de rutas problemáticas y cuantificación del impacto del retraso sobre la satisfacción del cliente."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Tiempo promedio entrega"
          value={kpis.data ? kpis.data.tiempo_promedio.toFixed(1) : "—"}
          unit="días"
        />
        <KpiCard
          label="% Entrega puntual"
          value={fmtPct(kpis.data?.pct_puntual)}
          tone={
            kpis.data && kpis.data.pct_puntual >= 90
              ? "good"
              : kpis.data && kpis.data.pct_puntual >= 80
              ? "warn"
              : "bad"
          }
        />
        <KpiCard
          label="Retraso promedio (atrasados)"
          value={
            kpis.data ? kpis.data.retraso_avg_atrasados.toFixed(1) : "—"
          }
          unit="días"
          tone="warn"
          hint="Solo pedidos que llegaron tarde"
        />
        <KpiCard
          label="% Retraso crítico (>7 días)"
          value={fmtPct(kpis.data?.pct_retraso_critico)}
          tone={
            kpis.data && kpis.data.pct_retraso_critico <= 3
              ? "good"
              : kpis.data && kpis.data.pct_retraso_critico <= 6
              ? "warn"
              : "bad"
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Cruce clave: días de retraso vs satisfacción"
          subtitle="Cuanto mayor el retraso, más cae el rating y más sube el % de reseñas malas"
          height={340}
        >
          {buckets.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <ComposedChart data={buckets.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="bucket_retraso" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="l"
                  tick={{ fontSize: 11 }}
                  domain={[0, 5]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip />
                <Bar
                  yAxisId="r"
                  dataKey="pct_malas"
                  fill={colors.rojo}
                  name="% Reseñas malas"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="rating_avg"
                  stroke={colors.primario}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Rating promedio"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top 10 rutas con peor puntualidad"
          subtitle="Origen → destino con menor % entrega a tiempo"
          height={340}
        >
          {rutas.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={peores}
                layout="vertical"
                margin={{ left: 70, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey={(r: Ruta) => `${r.origen} → ${r.destino}`}
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(v: number) => fmtPct(v)}
                  labelFormatter={(label: string) => `Ruta: ${label}`}
                />
                <Bar
                  dataKey="pct_puntual"
                  name="% Puntualidad"
                  radius={[0, 4, 4, 0]}
                >
                  {peores.map((r) => (
                    <Cell
                      key={`${r.origen}-${r.destino}`}
                      fill={
                        r.pct_puntual >= 80
                          ? colors.acento
                          : r.pct_puntual >= 60
                          ? "#DD6B20"
                          : colors.rojo
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-bold text-grisTexto mb-3">
          Tabla de rutas problemáticas
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2 px-2">Origen</th>
                <th className="text-left py-2 px-2">Destino</th>
                <th className="text-right py-2 px-2">Pedidos</th>
                <th className="text-right py-2 px-2">Días entrega</th>
                <th className="text-right py-2 px-2">% Puntual</th>
                <th className="text-right py-2 px-2">% Retraso crítico</th>
              </tr>
            </thead>
            <tbody>
              {peores.slice(0, 10).map((r) => (
                <tr
                  key={`${r.origen}-${r.destino}`}
                  className="border-b border-gray-50"
                >
                  <td className="py-2 px-2 font-medium">
                    {r.origen}{" "}
                    <span className="text-gray-400">({r.origen_region})</span>
                  </td>
                  <td className="py-2 px-2 font-medium">
                    {r.destino}{" "}
                    <span className="text-gray-400">({r.destino_region})</span>
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtNumber(r.pedidos)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {r.dias_entrega_avg.toFixed(1)}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-semibold ${
                      r.pct_puntual < 70
                        ? "text-critico"
                        : r.pct_puntual < 85
                        ? "text-acento"
                        : "text-secundario"
                    }`}
                  >
                    {fmtPct(r.pct_puntual)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtPct(r.pct_retraso_critico)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
