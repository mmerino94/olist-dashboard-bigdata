import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { useApi } from "../api/client";
import ChartCard, { Loading, PageTitle } from "../components/ChartCard";
import { colors } from "../lib/colors";
import { fmtCurrency, fmtCurrencyShort, fmtNumber, fmtPct } from "../lib/format";
import { categoriaEs } from "../lib/translate";

type Categoria = {
  categoria: string;
  pedidos: number;
  unidades_vendidas: number;
  productos_distintos: number;
  ingreso_total: number;
  ticket_promedio: number;
  flete_pct: number;
  pct_puntual: number;
  pct_resenas_malas: number;
  pct_ingreso: number;
  pct_acumulado: number;
  pareto: string;
};

type Pago = {
  tipo_pago: string;
  pedidos: number;
  cuotas_promedio: number;
  ingreso_total: number;
  ticket_promedio: number;
};

type ProductoRetirar = {
  id_producto: string;
  categoria: string;
  pedidos: number;
  unidades: number;
  ingresos: number;
  pct_resenas_malas: number;
  rating_avg: number;
  score_retiro: number;
};

export default function Rentabilidad() {
  const cats = useApi<Categoria[]>("/api/p1/categorias");
  const pagos = useApi<Pago[]>("/api/p1/forma_pago");
  const retirar = useApi<ProductoRetirar[]>("/api/p1/productos_retirar", "top=12");

  const top10 = (cats.data ?? [])
    .slice(0, 10)
    .map((c) => ({ ...c, categoria: categoriaEs(c.categoria) }));
  const core = (cats.data ?? []).filter((c) => c.pareto === "Core 80%");

  // Categoría que más nos QUITA: la que tiene mayor ingreso en riesgo por
  // reseñas malas (ingreso × % reseñas malas). Considera solo las que aportan
  // ≥1% del ingreso total para evitar ruido del long tail.
  const peor = (cats.data ?? [])
    .filter((c) => c.pct_ingreso >= 1 && c.pct_resenas_malas != null)
    .reduce<(Categoria & { perdida: number }) | null>((acc, c) => {
      const perdida = (c.ingreso_total * (c.pct_resenas_malas ?? 0)) / 100;
      if (!acc || perdida > acc.perdida) return { ...c, perdida };
      return acc;
    }, null);

  return (
    <div>
      <PageTitle
        problema="P1 · Rentabilidad por categoría"
        titulo="¿Qué nos genera dinero y qué nos lo quita?"
        intro="Análisis de Pareto: cuántas categorías concentran el 80% del ingreso, qué ticket manejan, y cuáles tienen alta tasa de quejas a pesar de su volumen."
      />

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Stat
          label="Categorías totales"
          value={fmtNumber(cats.data?.length)}
          unit="categorías"
        />
        <Stat
          label="Concentración Pareto 80%"
          value={fmtNumber(core.length)}
          unit="categorías"
          hint={`${cats.data ? Math.round((core.length / cats.data.length) * 100) : 0}% del catálogo`}
        />
        <Stat
          label="Ticket promedio top 1"
          value={fmtCurrencyShort(top10[0]?.ticket_promedio)}
          hint={top10[0]?.categoria}
        />
        <Stat
          label="% más alto de reseñas malas"
          value={fmtPct(
            Math.max(...(cats.data ?? []).map((c) => c.pct_resenas_malas || 0)),
          )}
          hint={categoriaEs(
            (cats.data ?? []).reduce<Categoria | null>(
              (acc, c) =>
                !acc || c.pct_resenas_malas > acc.pct_resenas_malas ? c : acc,
              null,
            )?.categoria,
          )}
        />
        <Stat
          label="Mayor pérdida potencial"
          value={fmtCurrencyShort(peor?.perdida)}
          hint={
            peor
              ? `${categoriaEs(peor.categoria)} · ${fmtPct(peor.pct_resenas_malas)} reseñas malas`
              : "—"
          }
          tone="bad"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Pareto de categorías por ingreso"
          subtitle="Barras = ingreso · Línea = % acumulado"
          height={360}
        >
          {cats.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <ComposedChart data={top10} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  yAxisId="l"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `R$${(v / 1_000_000).toFixed(1)}M`
                      : `R$${Math.round(v / 1000)}k`
                  }
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "Ingreso"
                      ? fmtCurrency(value)
                      : `${value.toFixed(1)}%`
                  }
                />
                <Bar
                  yAxisId="l"
                  dataKey="ingreso_total"
                  fill={colors.primario}
                  name="Ingreso"
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="pct_acumulado"
                  stroke={colors.acento}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="% Acumulado"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Reseñas malas vs Ingreso por categoría"
          subtitle="Pasa el mouse sobre cada barra para ver pedidos, unidades y SKUs distintos"
          height={360}
        >
          <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px]">
            <span className="text-gray-500 font-semibold">Semáforo:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors.secundario }} />
              <span className="text-gray-600">Saludable (&lt; 14%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors.acento }} />
              <span className="text-gray-600">A vigilar (14–18%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors.rojo }} />
              <span className="text-gray-600">Crítica (≥ 18%)</span>
            </span>
          </div>
          {cats.loading ? (
            <Loading />
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={top10}
                layout="vertical"
                margin={{ left: 80, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip content={<CategoriaTooltip />} />
                <Bar
                  dataKey="pct_resenas_malas"
                  name="% Reseñas malas"
                  radius={[0, 4, 4, 0]}
                >
                  {top10.map((c) => (
                    <Cell
                      key={c.categoria}
                      fill={
                        c.pct_resenas_malas >= 18
                          ? colors.rojo
                          : c.pct_resenas_malas >= 14
                          ? colors.acento
                          : colors.secundario
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="mb-4">
        <ChartCard
          title="Productos candidatos a retirar"
          subtitle="Bajo ingreso + alta tasa de reseñas malas (≥30% malas, ≥10 pedidos). Score = % malas ÷ log(ingreso) — mayor score, más urgente."
          height={420}
        >
          {retirar.loading ? (
            <Loading />
          ) : (retirar.data ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              No hay productos que cumplan los criterios con los filtros actuales.
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart
                data={retirar.data ?? []}
                layout="vertical"
                margin={{ left: 100, right: 30 }}
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
                  dataKey={(p: ProductoRetirar) => {
                    const idx = (retirar.data ?? []).indexOf(p) + 1;
                    const cat = p.categoria ? categoriaEs(p.categoria) : "Sin categoría";
                    const sku = p.id_producto.slice(0, 6);
                    return `#${idx}  ${cat}  ·  SKU ${sku}`;
                  }}
                  tick={{ fontSize: 11 }}
                  width={260}
                  interval={0}
                />
                <Tooltip content={<RetirarTooltip />} />
                <Bar
                  dataKey="pct_resenas_malas"
                  name="% Reseñas malas"
                  radius={[0, 4, 4, 0]}
                >
                  {(retirar.data ?? []).map((p) => (
                    <Cell
                      key={p.id_producto}
                      fill={
                        p.pct_resenas_malas >= 60
                          ? colors.rojo
                          : p.pct_resenas_malas >= 45
                          ? "#DD6B20"
                          : colors.acento
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <p className="text-xs text-gray-500 mt-2 italic px-1">
          Recomendación: estos productos generan poco ingreso pero arrastran reputación.
          Antes de retirar, revisar si son del mismo proveedor (acción a nivel proveedor)
          o si responden a un problema operativo (empaque, descripción engañosa).
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-5 overflow-x-auto">
          <h3 className="text-base font-bold text-grisTexto mb-3">
            Tabla detallada · Top 15 categorías
          </h3>
          <table className="min-w-full text-xs">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2 px-2">Categoría</th>
                <th className="text-right py-2 px-2">Ingreso</th>
                <th className="text-right py-2 px-2">% Total</th>
                <th className="text-right py-2 px-2">Pedidos</th>
                <th className="text-right py-2 px-2">Ticket</th>
                <th className="text-right py-2 px-2">% Puntual</th>
                <th className="text-right py-2 px-2">% Reseñas malas</th>
              </tr>
            </thead>
            <tbody>
              {(cats.data ?? []).slice(0, 15).map((c) => (
                <tr key={c.categoria} className="border-b border-gray-50">
                  <td className="py-2 px-2 font-medium">{categoriaEs(c.categoria)}</td>
                  <td className="text-right py-2 px-2">
                    {fmtCurrency(c.ingreso_total)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtPct(c.pct_ingreso)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtNumber(c.pedidos)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtCurrency(c.ticket_promedio)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {fmtPct(c.pct_puntual)}
                  </td>
                  <td
                    className={`text-right py-2 px-2 font-semibold ${
                      c.pct_resenas_malas >= 18
                        ? "text-critico"
                        : c.pct_resenas_malas >= 14
                        ? "text-acento"
                        : "text-secundario"
                    }`}
                  >
                    {fmtPct(c.pct_resenas_malas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <FormaPagoDonut pagos={pagos.data ?? []} loading={pagos.loading} />
      </section>
    </div>
  );
}

function RetirarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ProductoRetirar;
  const cat = p.categoria ? categoriaEs(p.categoria) : "Sin categoría asignada";
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-3 text-xs">
      <div className="text-[10px] text-gray-400 mb-1">SKU: <span className="font-mono">{p.id_producto}</span></div>
      <div className="font-bold text-grisTexto mb-2">{cat}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-gray-500">% Reseñas malas:</span>
        <span className="font-semibold text-critico text-right">
          {p.pct_resenas_malas?.toFixed(1)}%
        </span>
        <span className="text-gray-500">Rating promedio:</span>
        <span className="text-right tabular-nums">{p.rating_avg?.toFixed(2)} / 5</span>
        <span className="text-gray-500">Ingresos:</span>
        <span className="text-right">{fmtCurrencyShort(p.ingresos)}</span>
        <span className="text-gray-500">Pedidos:</span>
        <span className="text-right tabular-nums">{fmtNumber(p.pedidos)}</span>
        <span className="text-gray-500">Unidades:</span>
        <span className="text-right tabular-nums">{fmtNumber(p.unidades)}</span>
        <span className="text-gray-500">Score retiro:</span>
        <span className="text-right font-semibold text-critico">{p.score_retiro?.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// FORMA DE PAGO — Donut chart con sector activo y total en el centro
// ============================================================================

const PAGO_ES: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  boleto: "Boleta bancaria",
  voucher: "Cupón / voucher",
  debit_card: "Tarjeta de débito",
  not_defined: "No definido",
  no_disponible: "No disponible",
};

const PAGO_COLORS = ["#3C3489", "#0F6E56", "#BA7517", "#3182CE", "#A0AEC0"];

function FormaPagoDonut({
  pagos,
  loading,
}: {
  pagos: Pago[];
  loading: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const data = pagos.map((p) => ({
    ...p,
    label: PAGO_ES[p.tipo_pago] ?? p.tipo_pago,
  }));
  const totalIngreso = data.reduce((a, p) => a + p.ingreso_total, 0);
  const active = data[activeIndex];

  const renderActive = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
    } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 9}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col">
      <h3 className="text-base font-bold text-grisTexto">Forma de pago</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">
        Distribución del ingreso por método · pasa el mouse para detalle
      </p>

      <div className="relative" style={{ width: "100%", height: 240 }}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="ingreso_total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  activeIndex={activeIndex}
                  activeShape={renderActive}
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  isAnimationActive
                  animationDuration={500}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PAGO_COLORS[i % PAGO_COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                {active?.label ?? "Total"}
              </div>
              <div className="text-2xl font-bold text-primario tabular-nums leading-none mt-1">
                {fmtCurrencyShort(active?.ingreso_total ?? totalIngreso)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {active
                  ? `${((active.ingreso_total / totalIngreso) * 100).toFixed(1)}% · ${fmtNumber(active.pedidos)} pedidos`
                  : `${fmtNumber(data.reduce((a, p) => a + p.pedidos, 0))} pedidos`}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {data.map((p, i) => {
          const pct = (p.ingreso_total / totalIngreso) * 100;
          const isActive = i === activeIndex;
          return (
            <div
              key={p.tipo_pago}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded cursor-pointer transition ${
                isActive ? "bg-grisClaro" : ""
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: PAGO_COLORS[i % PAGO_COLORS.length] }}
                />
                <span className="truncate font-medium text-grisTexto">
                  {p.label}
                </span>
              </span>
              <span className="flex items-center gap-3 shrink-0 tabular-nums">
                <span className="text-gray-500">{pct.toFixed(1)}%</span>
                <span className="font-semibold text-grisTexto w-16 text-right">
                  {fmtCurrencyShort(p.ingreso_total)}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-gray-500">Ticket prom. (activo)</div>
          <div className="font-semibold tabular-nums">
            {active ? fmtCurrency(active.ticket_promedio) : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Cuotas promedio</div>
          <div className="font-semibold tabular-nums">
            {active ? `${active.cuotas_promedio?.toFixed(1)}×` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoriaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload as Categoria;
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md p-3 text-xs">
      <div className="font-bold text-grisTexto mb-2">{c.categoria}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-gray-500">% Reseñas malas:</span>
        <span className="font-semibold text-critico text-right">
          {c.pct_resenas_malas?.toFixed(1)}%
        </span>
        <span className="text-gray-500">Ingreso:</span>
        <span className="text-right">{fmtCurrencyShort(c.ingreso_total)}</span>
        <span className="text-gray-500">Pedidos:</span>
        <span className="text-right tabular-nums">{fmtNumber(c.pedidos)}</span>
        <span className="text-gray-500">Unidades vendidas:</span>
        <span className="text-right tabular-nums">{fmtNumber(c.unidades_vendidas)}</span>
        <span className="text-gray-500">SKUs distintos:</span>
        <span className="text-right tabular-nums">{fmtNumber(c.productos_distintos)}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "default" | "bad" | "good";
}) {
  const valueClass =
    tone === "bad"
      ? "text-critico"
      : tone === "good"
      ? "text-secundario"
      : "text-primario";
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col min-h-[140px] overflow-hidden">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="flex-1 flex items-center">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap min-w-0">
          <span
            className={`text-2xl md:text-3xl xl:text-[2rem] font-bold tabular-nums tracking-tight leading-none ${valueClass}`}
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
