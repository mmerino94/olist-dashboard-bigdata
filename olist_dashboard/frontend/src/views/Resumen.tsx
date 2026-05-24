import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { colors } from "../lib/colors";
import { fmtCurrency, fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";
import { categoriaEs } from "../lib/translate";

type Kpis = {
  pedidos: number;
  ingreso_total: number;
  ticket_promedio: number;
  pct_puntual: number;
  dias_entrega_promedio: number;
  rating_promedio: number;
  pct_resenas_malas: number;
};

type Mes = {
  periodo: string;
  pedidos: number;
  ingreso: number;
  rating: number;
};

type Categoria = {
  categoria: string;
  ingreso_total: number;
  pct_ingreso: number;
};

export default function Resumen() {
  const kpis = useApi<Kpis>("/api/resumen/kpis");
  const evol = useApi<Mes[]>("/api/resumen/evolucion");
  const cats = useApi<Categoria[]>("/api/p1/categorias");

  return (
    <div>
      <PageTitle
        titulo="Resumen ejecutivo"
        intro="Vista general del negocio: ingresos, operación y experiencia de cliente. Filtra por fecha, región o categoría usando el panel lateral."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Ingreso total"
          value={fmtCurrencyShort(kpis.data?.ingreso_total)}
          hint="Suma de precio + flete · pedidos entregados"
        />
        <KpiCard
          label="Pedidos"
          value={fmtNumber(kpis.data?.pedidos)}
          hint="Únicos en el período"
        />
        <KpiCard
          label="Ticket promedio"
          value={fmtCurrency(kpis.data?.ticket_promedio)}
          hint="Ingreso / pedidos"
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
          hint="Pedidos entregados ≤ fecha estimada"
        />
        <KpiCard
          label="Tiempo entrega"
          value={kpis.data ? kpis.data.dias_entrega_promedio.toFixed(1) : "—"}
          unit="días"
        />
        <KpiCard
          label="Rating promedio"
          value={kpis.data ? kpis.data.rating_promedio.toFixed(2) : "—"}
          unit="/ 5"
          tone={
            kpis.data && kpis.data.rating_promedio >= 4
              ? "good"
              : kpis.data && kpis.data.rating_promedio >= 3.5
              ? "warn"
              : "bad"
          }
        />
        <KpiCard
          label="% Reseñas malas"
          value={fmtPct(kpis.data?.pct_resenas_malas)}
          tone={
            kpis.data && kpis.data.pct_resenas_malas <= 10
              ? "good"
              : kpis.data && kpis.data.pct_resenas_malas <= 15
              ? "warn"
              : "bad"
          }
          hint="Puntuación 1-2 sobre total"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Evolución mensual de ingreso"
          subtitle="Tendencia 2016-2018 y picos de campaña"
        >
          {evol.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <LineChart data={evol.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `R$${(v / 1_000_000).toFixed(1)}M`
                      : `R$${Math.round(v / 1000)}k`
                  }
                />
                <Tooltip
                  formatter={(v: number) => fmtCurrency(v)}
                  labelStyle={{ color: "#444" }}
                />
                <Line
                  type="monotone"
                  dataKey="ingreso"
                  stroke={colors.primario}
                  strokeWidth={2.5}
                  dot={false}
                  name="Ingreso"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top 5 categorías por ingreso"
          subtitle="Concentración del negocio"
        >
          {cats.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={(cats.data ?? [])
                  .slice(0, 5)
                  .map((c) => ({ ...c, categoria: categoriaEs(c.categoria) }))}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `R$${(v / 1_000_000).toFixed(1)}M` : `R$${Math.round(v / 1000)}k`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Bar
                  dataKey="ingreso_total"
                  fill={colors.secundario}
                  radius={[0, 4, 4, 0]}
                  name="Ingreso"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
