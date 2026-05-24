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
import { segmentColors } from "../lib/colors";
import { fmtCurrency, fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";

type Segmento = {
  segmento: string;
  clientes: number;
  ingreso: number;
  ticket_avg: number;
  recency_avg: number;
  frequency_avg: number;
  pct_clientes: number;
  pct_ingreso: number;
};

type Recompra = {
  clientes_unicos: number;
  una_compra: number;
  recurrentes: number;
  tasa_recompra_pct: number;
  clv_aprox: number;
};

const ACCIONES: Record<string, string> = {
  VIP: "Programa de fidelidad premium · acceso anticipado a campañas · contenido exclusivo.",
  Frecuentes: "Bundles cruzados · cupones por segunda compra anual · upgrade a VIP por hábito.",
  "En riesgo":
    "Campaña de reactivación con descuento limitado · recuperación post-incidencia (queja, retraso).",
  Dormidos:
    "Email automatizado a 90 días · recordatorio de stock · ofertas en categoría histórica.",
  Perdidos:
    "Última oportunidad con descuento agresivo · si no responde, descartar del CRM activo.",
};

export default function Retencion() {
  const segs = useApi<Segmento[]>("/api/p2/segmentos");
  const rec = useApi<Recompra>("/api/p2/recompra");

  return (
    <div>
      <PageTitle
        problema="P2 · Retención de clientes"
        titulo="Los clientes compran una vez y no regresan"
        intro="Segmentación RFM (Recencia · Frecuencia · Monetario) para entender por qué la base no recompra y qué acción tomar con cada perfil."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Clientes únicos"
          value={fmtNumber(rec.data?.clientes_unicos)}
        />
        <KpiCard
          label="Tasa de recompra"
          value={fmtPct(rec.data?.tasa_recompra_pct)}
          tone={
            rec.data && rec.data.tasa_recompra_pct >= 20
              ? "good"
              : rec.data && rec.data.tasa_recompra_pct >= 10
              ? "warn"
              : "bad"
          }
          hint="Clientes con 2 o más pedidos"
        />
        <KpiCard
          label="Una sola compra"
          value={fmtNumber(rec.data?.una_compra)}
          tone="bad"
          hint="Lo que el negocio quiere reducir"
        />
        <KpiCard
          label="CLV aproximado"
          value={fmtCurrencyShort(rec.data?.clv_aprox)}
          hint="Ingreso total / clientes únicos"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Distribución de clientes por segmento" height={320}>
          {segs.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={segs.data ?? []}
                layout="vertical"
                margin={{ left: 70, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="segmento"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(v: number, n: string) =>
                    n === "clientes" ? fmtNumber(v) : fmtPct(v)
                  }
                />
                <Bar dataKey="clientes" name="Clientes" radius={[0, 4, 4, 0]}>
                  {(segs.data ?? []).map((s) => (
                    <Cell
                      key={s.segmento}
                      fill={segmentColors[s.segmento] ?? "#999"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Ingreso por segmento"
          subtitle="¿Quién genera el dinero hoy?"
          height={320}
        >
          {segs.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={segs.data ?? []}
                layout="vertical"
                margin={{ left: 70, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `R$${(v / 1_000_000).toFixed(1)}M`
                      : `R$${Math.round(v / 1000)}k`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="segmento"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Bar dataKey="ingreso" name="Ingreso" radius={[0, 4, 4, 0]}>
                  {(segs.data ?? []).map((s) => (
                    <Cell
                      key={s.segmento}
                      fill={segmentColors[s.segmento] ?? "#999"}
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
          Tabla de acciones recomendadas por segmento
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2 px-2">Segmento</th>
                <th className="text-right py-2 px-2">Clientes</th>
                <th className="text-right py-2 px-2">% Clientes</th>
                <th className="text-right py-2 px-2">% Ingreso</th>
                <th className="text-right py-2 px-2">Ticket avg</th>
                <th className="text-right py-2 px-2">Recencia</th>
                <th className="text-left py-2 px-2 pl-4">Acción recomendada</th>
              </tr>
            </thead>
            <tbody>
              {(segs.data ?? []).map((s) => (
                <tr key={s.segmento} className="border-b border-gray-50">
                  <td className="py-2 px-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-white font-semibold"
                      style={{
                        backgroundColor: segmentColors[s.segmento] ?? "#999",
                      }}
                    >
                      {s.segmento}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2">{fmtNumber(s.clientes)}</td>
                  <td className="text-right py-2 px-2">{fmtPct(s.pct_clientes)}</td>
                  <td className="text-right py-2 px-2">{fmtPct(s.pct_ingreso)}</td>
                  <td className="text-right py-2 px-2">
                    {fmtCurrency(s.ticket_avg)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {Math.round(s.recency_avg)} días
                  </td>
                  <td className="py-2 px-2 pl-4 text-gray-600">
                    {ACCIONES[s.segmento]}
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
