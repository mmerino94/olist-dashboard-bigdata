import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "../api/client";
import ChartCard, { Loading, PageTitle } from "../components/ChartCard";
import KpiCard from "../components/KpiCard";
import { sellerColors } from "../lib/colors";
import { fmtCurrency, fmtNumber, fmtPct } from "../lib/format";

type Semaforo = {
  clasificacion: string;
  vendedores: number;
  ingreso: number;
  rating_avg: number;
  puntualidad_avg: number;
  pct_vendedores: number;
  pct_ingreso: number;
};

type Top = {
  id_vendedor: string;
  estado: string;
  region: string;
  pedidos: number;
  ingreso: number;
  puntualidad: number;
  rating: number;
  pct_malas: number;
  retraso_avg: number;
  score: number;
  clasificacion: string;
};

export default function Vendedores() {
  const sem = useApi<Semaforo[]>("/api/p4/semaforo");
  const mejores = useApi<Top[]>("/api/p4/top", "tipo=mejores&n=10");
  const peores = useApi<Top[]>("/api/p4/top", "tipo=peores&n=10");

  const total = (sem.data ?? []).reduce((a, s) => a + s.vendedores, 0);
  const critico = (sem.data ?? []).find((s) => s.clasificacion === "Crítico");
  const elite = (sem.data ?? []).find((s) => s.clasificacion === "Elite");

  return (
    <div>
      <PageTitle
        problema="P4 · Desempeño de vendedores"
        titulo="Tenemos vendedores que dañan la reputación de la plataforma"
        intro="Semáforo basado en score compuesto (40% puntualidad + 35% rating + 15% reseñas malas + 10% retraso). Permite priorizar capacitación o baja."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Vendedores activos"
          value={fmtNumber(total)}
          hint="Con ≥ 5 pedidos"
        />
        <KpiCard
          label="Vendedores Elite"
          value={fmtNumber(elite?.vendedores)}
          tone="good"
          hint={`${elite?.pct_vendedores.toFixed(1) ?? 0}% del total`}
        />
        <KpiCard
          label="Vendedores Críticos"
          value={fmtNumber(critico?.vendedores)}
          tone="bad"
          hint="Acción inmediata"
        />
        <KpiCard
          label="Ingreso de vendedores Elite"
          value={fmtPct(elite?.pct_ingreso)}
          hint="% del ingreso plataforma"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Distribución del semáforo" height={320}>
          {sem.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart data={sem.data ?? []} margin={{ top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="clasificacion" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, n: string) =>
                    n === "Vendedores" ? fmtNumber(v) : fmtPct(v)
                  }
                />
                <Bar dataKey="vendedores" name="Vendedores" radius={[4, 4, 0, 0]}>
                  {(sem.data ?? []).map((s) => (
                    <Cell
                      key={s.clasificacion}
                      fill={sellerColors[s.clasificacion] ?? "#999"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="% de ingreso plataforma por nivel"
          subtitle="¿Cuánto pesa cada nivel en la facturación?"
          height={320}
        >
          {sem.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={sem.data ?? []}
                layout="vertical"
                margin={{ left: 50 }}
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
                  dataKey="clasificacion"
                  tick={{ fontSize: 11 }}
                  width={110}
                />
                <Tooltip formatter={(v: number) => fmtPct(v)} />
                <Bar
                  dataKey="pct_ingreso"
                  name="% Ingreso"
                  radius={[0, 4, 4, 0]}
                >
                  {(sem.data ?? []).map((s) => (
                    <Cell
                      key={s.clasificacion}
                      fill={sellerColors[s.clasificacion] ?? "#999"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingTable title="Top 10 mejores vendedores" data={mejores.data ?? []} />
        <RankingTable title="Top 10 peores vendedores" data={peores.data ?? []} />
      </section>
    </div>
  );
}

function RankingTable({ title, data }: { title: string; data: Top[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 overflow-x-auto">
      <h3 className="text-base font-bold text-grisTexto mb-3">{title}</h3>
      <table className="min-w-full text-xs">
        <thead className="text-gray-500 border-b">
          <tr>
            <th className="text-left py-2 px-2">Vendedor</th>
            <th className="text-left py-2 px-2">Estado</th>
            <th className="text-right py-2 px-2">Pedidos</th>
            <th className="text-right py-2 px-2">Ingreso</th>
            <th className="text-right py-2 px-2">Rating</th>
            <th className="text-right py-2 px-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v) => (
            <tr key={v.id_vendedor} className="border-b border-gray-50">
              <td className="py-2 px-2">
                <span className="font-mono text-[11px]">
                  {v.id_vendedor.slice(0, 10)}…
                </span>
              </td>
              <td className="py-2 px-2">{v.estado}</td>
              <td className="text-right py-2 px-2">{fmtNumber(v.pedidos)}</td>
              <td className="text-right py-2 px-2">{fmtCurrency(v.ingreso)}</td>
              <td className="text-right py-2 px-2">
                {v.rating ? v.rating.toFixed(2) : "—"}
              </td>
              <td className="text-right py-2 px-2">
                <span
                  className="inline-block px-2 py-0.5 rounded font-semibold text-white"
                  style={{
                    backgroundColor:
                      sellerColors[v.clasificacion] ?? "#999",
                  }}
                >
                  {v.score.toFixed(0)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
