# Vista "Explorador" (dashboard interactivo) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una vista React "Explorador": un tablero ejecutivo con panel de filtros globales (fecha/región/categoría/estado) que recalcula en vivo 6 KPIs + 5 gráficos avanzados (uno por problema), cada uno con enlace para profundizar en su sección P1–P5.

**Architecture:** El Explorador consume el backend FastAPI **en vivo** vía el hook `useApi` + `FiltersContext`. A diferencia de las 5 vistas de problema (que leen snapshots estáticos con `useSnapshot`), el Explorador necesita el backend corriendo. Hay que **montar `FiltersProvider`** (hoy no está montado) y **construir el panel de filtros** (hoy no existe). Los gráficos avanzados usan **echarts** (ya instalado). Se añaden 2 endpoints menores al backend (`p4/scatter`, `p3/regiones`).

**Tech Stack:** Vite + React 18 + TypeScript + TailwindCSS + **echarts / echarts-for-react** (ya en `package.json`) + react-router-dom 6. Backend: FastAPI + pandas (existente).

> **Nota sobre testing:** este proyecto **no tiene harness de tests** (sin vitest/pytest configurados; `package.json` sólo tiene dev/build/preview). Acorde al alcance académico del spec, cada tarea se **verifica ejecutando los servicios y observando salida concreta**: `curl` con salida esperada para el backend, y `npm run dev` + navegador para el frontend. Cuando un paso dice "Verificar", corre el comando exacto y confirma el resultado. No se inventa un harness nuevo (sería scope creep no pedido).

**Pre-requisito permanente (todas las tareas):** los 3 servicios corriendo. Desde `olist_dashboard/`:
```bash
docker start sqlserver
(cd backend && ../.venv/bin/uvicorn main:app --port 8000 &)
(cd frontend && npm run dev &)   # sirve en http://localhost:5173
```

---

## File Structure

**Nuevos (frontend):**
- `frontend/src/views/Explorador.tsx` — la vista; compone FilterPanel + KpiRow + grilla de 5 PanelCard.
- `frontend/src/components/explorador/FilterPanel.tsx` — barra de filtros globales (fecha, región, categoría, estado, pills, limpiar).
- `frontend/src/components/explorador/KpiRow.tsx` — fetch `resumen/kpis`, 6 KpiCard.
- `frontend/src/components/explorador/PanelCard.tsx` — wrapper de panel (badge, título, slot de gráfico, meta, enlace "Profundizar →", estados cargando/vacío/error).
- `frontend/src/components/explorador/charts/MatrizRentabilidad.tsx` — P1 burbuja (echarts).
- `frontend/src/components/explorador/charts/TreemapRFM.tsx` — P2 treemap (echarts).
- `frontend/src/components/explorador/charts/MapaRegiones.tsx` — P3 tile-map (divs + Tailwind).
- `frontend/src/components/explorador/charts/CuadranteVendedores.tsx` — P4 scatter (echarts).
- `frontend/src/components/explorador/charts/BalanceSatisfaccion.tsx` — P5 barra divergente + gauge (echarts).

**Modificados (frontend):**
- `frontend/src/main.tsx` — envolver `<App/>` en `<FiltersProvider>`.
- `frontend/src/App.tsx` — `/` → Explorador (landing), `/resumen` → Resumen.
- `frontend/src/components/Sidebar.tsx` — ítem "Explorador" como primero; Resumen a `/resumen`.
- `frontend/src/lib/colors.ts` — realinear paleta de charts a navy.

**Modificados (backend):**
- `backend/routes/p4_vendedores.py` — añadir `GET /api/p4/scatter`.
- `backend/routes/p3_logistica.py` — añadir `GET /api/p3/regiones`.

---

## Task 1: Realinear `colors.ts` a la paleta navy

**Files:**
- Modify: `frontend/src/lib/colors.ts` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `colors.ts`**

```ts
// Paleta de gráficos alineada a la identidad navy corporativa.
// Espejo de tailwind.config.js + BRIEF_DISENO_DASHBOARD_OLIST.md.
export const colors = {
  primario: "#27295a",   // navy
  secundario: "#304b9a", // navy-medium
  acento: "#3c78bb",     // blue-accent
  claro: "#85B7EB",      // blue-light
  verde: "#2f7d5b",      // good
  amarillo: "#b27a1a",   // warn
  rojo: "#a8423a",       // bad
  gris: "#71706f",
};

export const segmentColors: Record<string, string> = {
  VIP: "#27295a",
  Frecuentes: "#304b9a",
  "En riesgo": "#b27a1a",
  Dormidos: "#85B7EB",
  Perdidos: "#d1d0d6",
};

export const sellerColors: Record<string, string> = {
  Elite: "#2f7d5b",
  Estándar: "#3c78bb",
  "En observación": "#b27a1a",
  Crítico: "#a8423a",
};

export const ratingColors: Record<string, string> = {
  Buena: "#2f7d5b",
  Regular: "#b27a1a",
  Mala: "#a8423a",
};

export const palette = [
  "#27295a", "#304b9a", "#3c78bb", "#85B7EB",
  "#2f7d5b", "#b27a1a", "#a8423a", "#71706f",
];
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores (las claves de los Record se mantienen iguales que antes; sólo cambian los hex y se renombran `azul`→`acento` etc. — si alguna vista importa `colors.azul`, ajustar ese import al nuevo nombre `colors.acento`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/colors.ts
git commit -m "style: realinear paleta de charts (colors.ts) a navy corporativo"
```

---

## Task 2: Montar `FiltersProvider`

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Envolver App en FiltersProvider**

Reemplazar el contenido de `main.tsx` por:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FiltersProvider } from "./lib/filters";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FiltersProvider>
        <App />
      </FiltersProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores. (Las vistas existentes usan `useSnapshot`, no `useFilters`, así que envolver es inocuo.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: montar FiltersProvider en el árbol de React"
```

---

## Task 3: Ruta, navegación y stub de la vista

**Files:**
- Create: `frontend/src/views/Explorador.tsx` (stub)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Crear stub `Explorador.tsx`**

```tsx
export default function Explorador() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-ink">Explorador ejecutivo</h1>
      <p className="text-gray mt-1">En construcción…</p>
    </div>
  );
}
```

- [ ] **Step 2: Editar `App.tsx`**

Reemplazar el contenido por:

```tsx
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Explorador from "./views/Explorador";
import Resumen from "./views/Resumen";
import Rentabilidad from "./views/Rentabilidad";
import Retencion from "./views/Retencion";
import Logistica from "./views/Logistica";
import Vendedores from "./views/Vendedores";
import Satisfaccion from "./views/Satisfaccion";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Explorador />} />
        <Route path="/resumen" element={<Resumen />} />
        <Route path="/rentabilidad" element={<Rentabilidad />} />
        <Route path="/retencion" element={<Retencion />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/vendedores" element={<Vendedores />} />
        <Route path="/satisfaccion" element={<Satisfaccion />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: Editar `Sidebar.tsx` — actualizar `navSections`**

Reemplazar la constante `navSections` (líneas 8-23) por:

```tsx
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
```

Nota: el badge usa `P{it.num}`, lo que para el Explorador mostraría "P▦". Cambiar el render del badge en el `<NavLink>` (línea ~70) para no prefijar "P" cuando `num` no es numérico:

```tsx
<span className={cn("text-[11px] font-mono", isActive ? "text-blue-light" : "text-white/40")}>
  {/^\d+$/.test(it.num) ? `P${it.num}` : it.num}
</span>
```

- [ ] **Step 4: Verificar en navegador**

Run: `cd frontend && npm run dev` (si no está corriendo)
Abrir `http://localhost:5173/` → debe mostrar el stub "Explorador ejecutivo · En construcción".
Abrir `http://localhost:5173/resumen` → debe mostrar el Resumen anterior.
El sidebar muestra "Explorador" primero y "Resumen ejecutivo" debajo; clic navega correctamente.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/Explorador.tsx frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: ruta y navegación de la vista Explorador (landing por defecto)"
```

---

## Task 4: Backend — `GET /api/p4/scatter`

**Files:**
- Modify: `backend/routes/p4_vendedores.py` (añadir endpoint al final)

- [ ] **Step 1: Añadir el endpoint**

Al final de `p4_vendedores.py`:

```python
@router.get("/scatter")
def scatter_vendedores(f: Filters = Depends(filter_dep), min_pedidos: int = 5):
    """Todos los vendedores (con >= min_pedidos) para el cuadrante de desempeño."""
    df = _seller_metrics(f)
    if df.empty:
        return []
    df = df[df["pedidos"] >= min_pedidos]
    cols = ["id_vendedor", "region", "pedidos", "ingreso",
            "puntualidad", "rating", "clasificacion"]
    return df[cols].to_dict(orient="records")
```

- [ ] **Step 2: Verificar (curl)**

Run (con backend corriendo):
```bash
curl -s "http://127.0.0.1:8000/api/p4/scatter" | python3 -c "import sys,json;d=json.load(sys.stdin);print('vendedores:',len(d));print(json.dumps(d[0],ensure_ascii=False))"
```
Expected: un número grande de vendedores (~1500+) y un objeto con `puntualidad`, `rating`, `ingreso`, `clasificacion`.
Verificar reactividad al filtro:
```bash
curl -s "http://127.0.0.1:8000/api/p4/scatter?region=Sur" | python3 -c "import sys,json;print('Sur:',len(json.load(sys.stdin)))"
```
Expected: menos vendedores que sin filtro.

- [ ] **Step 3: Commit**

```bash
git add backend/routes/p4_vendedores.py
git commit -m "feat(api): endpoint p4/scatter para el cuadrante de vendedores"
```

---

## Task 5: Backend — `GET /api/p3/regiones`

**Files:**
- Modify: `backend/routes/p3_logistica.py` (añadir endpoint al final)

- [ ] **Step 1: Añadir el endpoint**

Al final de `p3_logistica.py`:

```python
@router.get("/regiones")
def retraso_por_region(f: Filters = Depends(filter_dep)):
    """Retraso y puntualidad agregados por región de destino (cliente)."""
    where, params = where_clause(f)
    sql = f"""
        SELECT
            geoc.region AS region,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(f.dias_retraso AS DECIMAL(8,2))), 1) AS retraso_avg,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual
        FROM FACT_VENTAS f
        JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY geoc.region
        ORDER BY retraso_avg DESC
    """
    return query(sql, params).to_dict(orient="records")
```

- [ ] **Step 2: Verificar (curl)**

Run:
```bash
curl -s "http://127.0.0.1:8000/api/p3/regiones" | python3 -m json.tool
```
Expected: 5 filas (una por región: Norte, Nordeste, Centro-Oeste, Sudeste, Sur) con `retraso_avg` y `pct_puntual`.

- [ ] **Step 3: Commit**

```bash
git add backend/routes/p3_logistica.py
git commit -m "feat(api): endpoint p3/regiones para el tile-map logístico"
```

---

## Task 6: `PanelCard` (wrapper de panel)

**Files:**
- Create: `frontend/src/components/explorador/PanelCard.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  badge: string;          // "P1 · RENTABILIDAD"
  accent: string;         // hex del borde superior
  titulo: string;
  meta: string;           // qué codifica el gráfico
  to: string;             // ruta para profundizar
  toLabel: string;        // "Profundizar en Rentabilidad"
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: ReactNode;    // el gráfico
};

export default function PanelCard({
  badge, accent, titulo, meta, to, toLabel, loading, error, empty, children,
}: Props) {
  return (
    <div
      className="bg-paper border border-gray-200 rounded-lg p-5 flex flex-col relative overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="text-[10px] font-semibold tracking-[0.07em] font-mono" style={{ color: accent }}>
        {badge}
      </div>
      <h3 className="text-[16px] font-semibold text-ink mt-1 mb-3 leading-tight">{titulo}</h3>

      <div className="flex-1 min-h-[150px]">
        {loading && <div className="h-[150px] flex items-center justify-center text-gray text-sm font-mono">Cargando…</div>}
        {error && <div className="h-[150px] flex items-center justify-center text-bad text-sm font-mono">Error: {error}</div>}
        {!loading && !error && empty && <div className="h-[150px] flex items-center justify-center text-gray text-sm font-mono">Sin datos para este filtro</div>}
        {!loading && !error && !empty && children}
      </div>

      <div className="text-[11px] text-gray mt-2 min-h-[14px]">{meta}</div>
      <Link to={to} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-accent mt-3 hover:underline">
        {toLabel} →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/PanelCard.tsx
git commit -m "feat: PanelCard wrapper con estados y drill-down"
```

---

## Task 7: `KpiRow` (6 KPIs en vivo)

**Files:**
- Create: `frontend/src/components/explorador/KpiRow.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { useApi } from "../../api/client";
import KpiCard from "../KpiCard";
import { fmtCurrencyShort, fmtNumber, fmtPct } from "../../lib/format";

type Kpis = {
  pedidos: number;
  ingreso_total: number;
  ticket_promedio: number;
  pct_puntual: number;
  rating_promedio: number;
  pct_resenas_malas: number;
};

export default function KpiRow() {
  const { data, loading, error } = useApi<Kpis>("/api/resumen/kpis");

  if (error) return <div className="text-bad text-sm font-mono py-4">Error KPIs: {error}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard label="Ingreso total" value={loading ? "…" : fmtCurrencyShort(data?.ingreso_total)} size="sm" />
      <KpiCard label="Pedidos" value={loading ? "…" : fmtNumber(data?.pedidos)} size="sm" />
      <KpiCard label="Ticket prom." value={loading ? "…" : fmtCurrencyShort(data?.ticket_promedio)} size="sm" />
      <KpiCard label="% Puntualidad" value={loading ? "…" : fmtPct(data?.pct_puntual)} tone="good" size="sm" />
      <KpiCard label="Rating" value={loading ? "…" : (data?.rating_promedio?.toFixed(2) ?? "—")} size="sm" />
      <KpiCard label="% Reseñas malas" value={loading ? "…" : fmtPct(data?.pct_resenas_malas)} tone="warn" size="sm" />
    </div>
  );
}
```

Nota: `resumen/kpis` no devuelve NPS; usamos "% Reseñas malas" como 6º KPI (dato real disponible). El NPS vive en el panel P5.

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/KpiRow.tsx
git commit -m "feat: KpiRow con 6 KPIs en vivo (resumen/kpis)"
```

---

## Task 8: `FilterPanel` (filtros globales)

**Files:**
- Create: `frontend/src/components/explorador/FilterPanel.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import { useFilters } from "../../lib/filters";
import { cn } from "../../lib/utils";

export default function FilterPanel() {
  const { filters, setFilters, reset, options } = useFilters();

  const regiones = options?.regiones ?? [];
  const categorias = options?.categorias ?? [];

  const activos: { label: string; clear: () => void }[] = [];
  if (filters.region) activos.push({ label: filters.region, clear: () => setFilters({ region: null }) });
  if (filters.categoria) activos.push({ label: filters.categoria, clear: () => setFilters({ categoria: null }) });
  if (filters.estado_pedido !== "delivered")
    activos.push({ label: `Estado: ${filters.estado_pedido}`, clear: () => setFilters({ estado_pedido: "delivered" }) });

  return (
    <div className="bg-paper border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.3fr_1fr_auto] gap-5 items-end">
        {/* Región (single-select como chips) */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Región</div>
          <div className="flex gap-1.5 flex-wrap">
            {regiones.map((r) => {
              const on = filters.region === r;
              return (
                <button
                  key={r}
                  onClick={() => setFilters({ region: on ? null : r })}
                  className={cn(
                    "text-[12.5px] px-3 py-1.5 rounded-full border font-medium transition-colors",
                    on ? "bg-navy text-white border-navy" : "border-gray-200 text-gray hover:border-blue-accent"
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categoría */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Categoría</div>
          <select
            value={filters.categoria ?? ""}
            onChange={(e) => setFilters({ categoria: e.target.value || null })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] bg-paper"
          >
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Estado */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.07em] text-gray font-mono mb-2">Estado pedido</div>
          <select
            value={filters.estado_pedido}
            onChange={(e) => setFilters({ estado_pedido: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] bg-paper"
          >
            <option value="delivered">Entregados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <button onClick={reset} className="bg-navy text-white rounded-lg px-4 py-2.5 text-[13px] font-medium h-[42px]">
          ↺ Limpiar
        </button>
      </div>

      {activos.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
          <span className="text-[11px] text-gray font-mono">Filtros activos:</span>
          {activos.map((a) => (
            <button key={a.label} onClick={a.clear}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-blue-accent bg-blue-accent/10 px-3 py-1 rounded-full">
              {a.label} <span className="opacity-60">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Nota v1: el rango de fechas se omite del panel (el slider del mockup es cosmético); `desde/hasta` quedan en `null` (= rango completo). Añadir date pickers es una mejora trivial posterior si se quiere. Región es single-select (el backend filtra por una región), presentado como chips toggle.

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/FilterPanel.tsx
git commit -m "feat: FilterPanel de filtros globales (región/categoría/estado)"
```

---

## Task 9: Chart P1 — `MatrizRentabilidad` (burbuja)

**Files:**
- Create: `frontend/src/components/explorador/charts/MatrizRentabilidad.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Cat = {
  categoria: string;
  ingreso_total: number;
  flete_pct: number;
  pct_resenas_malas: number;
};

export default function MatrizRentabilidad() {
  const { data, loading, error } = useApi<Cat[]>("/api/p1/categorias");
  const rows = data ?? [];

  const color = (c: Cat) =>
    c.flete_pct >= 35 && c.pct_resenas_malas >= 15 ? colors.rojo
      : c.flete_pct < 25 && c.pct_resenas_malas < 12 ? colors.verde
      : colors.acento;

  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso_total));
  const option = {
    grid: { left: 44, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "% reseñas malas", nameLocation: "middle", nameGap: 22,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    yAxis: { name: "flete %", axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    tooltip: {
      formatter: (p: any) =>
        `<b>${p.data[3]}</b><br/>reseñas malas: ${p.data[0]}%<br/>flete: ${p.data[1]}%<br/>ingreso: R$${(p.data[2] / 1000).toFixed(0)}k`,
    },
    series: [{
      type: "scatter",
      symbolSize: (d: number[]) => 8 + (d[2] / maxIng) * 42,
      data: rows.map((r) => ({
        value: [r.pct_resenas_malas, r.flete_pct, r.ingreso_total, r.categoria],
        itemStyle: { color: color(r), opacity: 0.78 },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P1 · RENTABILIDAD" accent={colors.primario}
      titulo="Matriz estrella / trampa" meta="x: % reseñas malas · y: flete % · tamaño: ingreso"
      to="/rentabilidad" toLabel="Profundizar en Rentabilidad"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores. (Visual se valida en Task 14.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/charts/MatrizRentabilidad.tsx
git commit -m "feat: panel P1 matriz de rentabilidad (burbuja echarts)"
```

---

## Task 10: Chart P2 — `TreemapRFM`

**Files:**
- Create: `frontend/src/components/explorador/charts/TreemapRFM.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors, segmentColors } from "../../../lib/colors";

type Seg = { segmento: string; clientes: number; ingreso: number; pct_ingreso: number };

export default function TreemapRFM() {
  const { data, loading, error } = useApi<Seg[]>("/api/p2/segmentos");
  const rows = data ?? [];

  const option = {
    tooltip: { formatter: (p: any) => `<b>${p.name}</b><br/>ingreso: R$${(p.value / 1000).toFixed(0)}k<br/>${p.data.pct}% del ingreso` },
    series: [{
      type: "treemap",
      roam: false, nodeClick: false, breadcrumb: { show: false },
      label: { show: true, formatter: "{b}", color: "#fff", fontSize: 12, fontWeight: 600 },
      itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
      data: rows.map((s) => ({
        name: s.segmento, value: s.ingreso, pct: s.pct_ingreso,
        itemStyle: { color: segmentColors[s.segmento] ?? colors.acento },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P2 · RETENCIÓN" accent={colors.secundario}
      titulo="Treemap de segmentos RFM" meta="área = ingreso del segmento"
      to="/retencion" toLabel="Profundizar en Retención"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/charts/TreemapRFM.tsx
git commit -m "feat: panel P2 treemap de segmentos RFM (echarts)"
```

---

## Task 11: Chart P3 — `MapaRegiones` (tile-map)

**Files:**
- Create: `frontend/src/components/explorador/charts/MapaRegiones.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
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
```

Nota: el tile-map es v1 sin dependencias. Mejora futura: `echarts` con geoJSON de Brasil para coroplético real por estado.

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/charts/MapaRegiones.tsx
git commit -m "feat: panel P3 tile-map de retraso por región"
```

---

## Task 12: Chart P4 — `CuadranteVendedores` (scatter)

**Files:**
- Create: `frontend/src/components/explorador/charts/CuadranteVendedores.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors, sellerColors } from "../../../lib/colors";

type Sel = { puntualidad: number; rating: number; ingreso: number; clasificacion: string };

export default function CuadranteVendedores() {
  const { data, loading, error } = useApi<Sel[]>("/api/p4/scatter");
  const rows = data ?? [];
  const maxIng = Math.max(1, ...rows.map((r) => r.ingreso));

  const option = {
    grid: { left: 36, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "% puntualidad", nameLocation: "middle", nameGap: 22, min: 0, max: 100,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    yAxis: { name: "rating", min: 0, max: 5,
             axisLine: { lineStyle: { color: "#d1d0d6" } }, splitLine: { lineStyle: { color: "#ecebf1" } } },
    tooltip: { formatter: (p: any) => `${p.data[3]}<br/>puntualidad: ${p.data[0]}%<br/>rating: ${p.data[1]}` },
    series: [{
      type: "scatter",
      symbolSize: (d: number[]) => 6 + (d[2] / maxIng) * 34,
      data: rows.map((r) => ({
        value: [Math.round(r.puntualidad * 100), r.rating, r.ingreso, r.clasificacion],
        itemStyle: { color: sellerColors[r.clasificacion] ?? colors.gris, opacity: 0.6 },
      })),
    }],
  };

  return (
    <PanelCard
      badge="P4 · VENDEDORES" accent={colors.verde}
      titulo="Cuadrante de desempeño" meta="x: puntualidad · y: rating · tamaño: ingreso · color: semáforo"
      to="/vendedores" toLabel="Profundizar en Vendedores"
      loading={loading} error={error} empty={rows.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
```

Nota: `puntualidad` viene 0–1 del backend; se escala a 0–100 en el `value`.

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/charts/CuadranteVendedores.tsx
git commit -m "feat: panel P4 cuadrante de vendedores (scatter echarts)"
```

---

## Task 13: Chart P5 — `BalanceSatisfaccion` (divergente + gauge)

**Files:**
- Create: `frontend/src/components/explorador/charts/BalanceSatisfaccion.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import ReactECharts from "echarts-for-react";
import { useApi } from "../../../api/client";
import PanelCard from "../PanelCard";
import { colors } from "../../../lib/colors";

type Dist = { score: number; satisfaccion: string; n: number; pct: number };
type P5 = { distribucion: Dist[]; nps_estimado: number; total_resenas: number };

export default function BalanceSatisfaccion() {
  const { data, loading, error } = useApi<P5>("/api/p5/distribucion");
  const dist = data?.distribucion ?? [];
  const nps = data?.nps_estimado ?? 0;

  const sum = (pred: (d: Dist) => boolean) =>
    Math.round(dist.filter(pred).reduce((a, d) => a + d.pct, 0) * 10) / 10;
  const malas = sum((d) => d.score <= 2);
  const regular = sum((d) => d.score === 3);
  const buenas = sum((d) => d.score >= 4);

  const option = {
    grid: { left: 8, right: 8, top: 8, bottom: 70 },
    xAxis: { type: "value", max: 100, show: false },
    yAxis: { type: "category", data: ["Reseñas"], show: false },
    tooltip: { trigger: "item" },
    series: [
      { name: "Malas", type: "bar", stack: "x", data: [malas], itemStyle: { color: colors.rojo }, label: { show: true, formatter: `${malas}%`, color: "#fff" } },
      { name: "Regular", type: "bar", stack: "x", data: [regular], itemStyle: { color: colors.gris } },
      { name: "Buenas", type: "bar", stack: "x", data: [buenas], itemStyle: { color: colors.verde }, label: { show: true, formatter: `${buenas}%`, color: "#fff" } },
      {
        type: "gauge", center: ["50%", "118%"], radius: "115%",
        startAngle: 180, endAngle: 0, min: -100, max: 100, splitNumber: 4,
        progress: { show: true, width: 12, itemStyle: { color: colors.amarillo } },
        axisLine: { lineStyle: { width: 12, color: [[1, "#ecebf1"]] } },
        axisLabel: { show: false }, axisTick: { show: false }, splitLine: { show: false }, pointer: { show: false },
        detail: { valueAnimation: true, offset: [0, -18], fontSize: 22, fontWeight: 700, color: colors.primario, formatter: "NPS {value}" },
        data: [{ value: nps }],
      },
    ],
  };

  return (
    <PanelCard
      badge="P5 · SATISFACCIÓN" accent={colors.amarillo}
      titulo="Balance de reseñas + NPS" meta="negativas / neutras / positivas + NPS estimado"
      to="/satisfaccion" toLabel="Profundizar en Satisfacción"
      loading={loading} error={error} empty={dist.length === 0}
    >
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
    </PanelCard>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/explorador/charts/BalanceSatisfaccion.tsx
git commit -m "feat: panel P5 balance de reseñas + gauge NPS (echarts)"
```

---

## Task 14: Ensamblar la vista `Explorador`

**Files:**
- Modify: `frontend/src/views/Explorador.tsx` (reemplazo del stub)

- [ ] **Step 1: Reemplazar `Explorador.tsx`**

```tsx
import FilterPanel from "../components/explorador/FilterPanel";
import KpiRow from "../components/explorador/KpiRow";
import MatrizRentabilidad from "../components/explorador/charts/MatrizRentabilidad";
import TreemapRFM from "../components/explorador/charts/TreemapRFM";
import MapaRegiones from "../components/explorador/charts/MapaRegiones";
import CuadranteVendedores from "../components/explorador/charts/CuadranteVendedores";
import BalanceSatisfaccion from "../components/explorador/charts/BalanceSatisfaccion";

export default function Explorador() {
  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink tracking-tight">Explorador ejecutivo</h1>
          <p className="text-[13.5px] text-gray mt-0.5">Visión 360° del negocio · cada panel profundiza en su análisis</p>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-good font-medium">
          <span className="w-2 h-2 rounded-full bg-good" /> Datos en vivo
        </div>
      </header>

      <FilterPanel />
      <KpiRow />

      <div className="text-[11px] uppercase tracking-[0.1em] text-gray font-mono mt-1">
        Análisis por problema · clic para profundizar
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MatrizRentabilidad />
        <TreemapRFM />
        <MapaRegiones />
        <CuadranteVendedores />
        <BalanceSatisfaccion />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build + visual**

Run: `cd frontend && npx tsc -b --noEmit` → sin errores.
Con los 3 servicios corriendo, abrir `http://localhost:5173/`:
- Se ven los 6 KPIs con números reales (Ingreso ~R$15.4M, etc.).
- Se ven los 5 paneles con sus gráficos renderizados.
- Cada panel tiene "Profundizar … →".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Explorador.tsx
git commit -m "feat: ensamblar vista Explorador (filtros + KPIs + 5 paneles)"
```

---

## Task 15: Verificación de reactividad y navegación (criterio de éxito)

**Files:** ninguno (verificación end-to-end)

- [ ] **Step 1: Verificar reactividad de filtros (criterio clave)**

Con todo corriendo, en `http://localhost:5173/`:
1. Anota el valor del KPI "Ingreso total" sin filtros (~R$15.4M).
2. Clic en la región **Sudeste**.
3. **Esperado:** "Ingreso total" baja (~R$9.9M), "Pedidos" baja (~66K), y los 5 gráficos cambian (menos burbujas/puntos, treemap recalculado, tile-map sólo con datos de destino Sudeste, etc.).
4. Aparece la pill "Sudeste" en filtros activos; clic en ✕ la quita y todo vuelve al total.
5. Elegir una categoría en el dropdown → KPIs y paneles se recalculan.

Verificación de respaldo por API (debe coincidir con lo que muestra la UI):
```bash
curl -s "http://127.0.0.1:8000/api/resumen/kpis?region=Sudeste" | python3 -c "import sys,json;d=json.load(sys.stdin);print('Sudeste ingreso:',d['ingreso_total'],'pedidos:',d['pedidos'])"
```
Expected: `Sudeste ingreso: ~9947843 pedidos: ~66143`.

- [ ] **Step 2: Verificar navegación de drill-down**

Clic en "Profundizar en Rentabilidad →" → navega a `/rentabilidad`. Repetir mentalmente para los 5 (cada `to` apunta a su ruta). Volver con el sidebar a "Explorador".

- [ ] **Step 3: Verificar robustez (filtro sin datos)**

Elegir una combinación rara (p.ej. categoría con poquísimos datos en una región chica). Esperado: paneles sin datos muestran "Sin datos para este filtro" y **el resto del tablero sigue** sin romperse.

- [ ] **Step 4: Commit final (si hubo ajustes) y cierre**

```bash
git add -A
git commit -m "test: verificación end-to-end del Explorador (reactividad + drill-down)" || echo "nada que commitear"
```

---

## Self-Review (cobertura del spec)

- §4.1 Panel de filtros → Task 8 (región single-select, categoría, estado, pills, limpiar; fechas omitidas v1 según nota).
- §4.2 Fila de 6 KPIs → Task 7 (6º KPI = % reseñas malas; NPS vive en panel P5, documentado).
- §4.3 Cinco paneles → Tasks 9–13; ensamblados en Task 14; drill-down en PanelCard (Task 6).
- §4.4 Estados por panel → Task 6 (PanelCard maneja loading/empty/error de forma aislada).
- §5 Ajustes backend → Task 4 (p4/scatter), Task 5 (p3/regiones).
- §6 Paleta navy → Task 1.
- §7 Verificación → Task 15 (reactividad, navegación, robustez).
- Montar FiltersProvider (descubierto en exploración, no estaba en spec) → Task 2.
- Ruta/landing por defecto + nav → Task 3.

Desviaciones documentadas: (a) sin harness de tests → verificación por ejecución; (b) fechas fuera de v1 en el panel; (c) p3/regiones como endpoint en vez de agregación cliente (más correcto: promedio ponderado lo justifica).
