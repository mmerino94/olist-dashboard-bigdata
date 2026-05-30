# Cinco vistas de problema (P1–P5) en React — Plan de implementación

> **For agentic workers:** implementar tarea por tarea. Pasos con checkbox `- [ ]`.

**Goal:** Convertir las 5 vistas placeholder (Rentabilidad, Retención, Logística, Vendedores, Satisfacción) en vistas React funcionales, conectadas al backend en vivo, con filtros globales, cumpliendo el criterio 6 de la rúbrica (5 vistas funcionales + filtros operativos fecha/región/categoría).

**Architecture:** Se añade una **barra de filtros global** en `Layout` (sobre el Outlet) que escribe en el `FiltersContext` ya existente → todas las vistas (Explorador + las 5) reaccionan en vivo vía `useApi`. Cada vista compone KPIs (`KpiCard`) + 2-3 gráficos (echarts, modelados en los componentes ya probados del Explorador) + tabla clave (`DataTable` nuevo) + insight (`HeroBanner`/texto). Alcance **rúbrica-óptimo**: se difieren los visuales caros (matriz RFM 5×5, bigramas, Lannister, choropleth por estado).

**Tech Stack:** React 18 + TS + Tailwind + echarts-for-react (instalados). Backend FastAPI existente — **sin endpoints nuevos** (los 13 endpoints usados ya responden 200).

**Pre-requisito:** 3 servicios corriendo (docker `sqlserver`, uvicorn :8000, vite :5173). Verificar con `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/p1/categorias` → 200.

**Testing:** sin harness de tests; verificación por `npx tsc -b --noEmit` + `npm run build` + carga en navegador. Cada vista se valida visualmente y por reactividad a un filtro.

---

## File Structure

**Nuevos:**
- `frontend/src/components/GlobalFilterBar.tsx` — barra de filtros global (fecha, región, categoría, estado) para `Layout`.
- `frontend/src/components/DataTable.tsx` — tabla genérica ordenable (usada por P1, P3, P4).
- Por vista, componentes de gráfico en `frontend/src/components/views/<vista>/`:
  - P1: `ParetoCategorias.tsx`, `ScatterTrampa.tsx`
  - P2: `SegmentosBar.tsx`
  - P3: `RetrasoSatisfaccion.tsx`, `RegionesBar.tsx`
  - P4: `ScatterVendedores.tsx`, `SemaforoBar.tsx`
  - P5: `DistribucionRating.tsx`, `EvolucionRating.tsx`, `PalabrasBar.tsx`

**Modificados:**
- `frontend/src/components/Layout.tsx` — montar `GlobalFilterBar`.
- `frontend/src/components/explorador/FilterPanel.tsx` + `views/Explorador.tsx` — quitar el panel inline (ahora global).
- `frontend/src/views/Rentabilidad.tsx`, `Retencion.tsx`, `Logistica.tsx`, `Vendedores.tsx`, `Satisfaccion.tsx` — reemplazar placeholders por contenido real.

**Patrón de referencia:** los componentes de `frontend/src/components/explorador/charts/` (MatrizRentabilidad, TreemapRFM, MapaRegiones, CuadranteVendedores, BalanceSatisfaccion) son los **modelos** a seguir para los nuevos charts: `useApi`, option de echarts sin tipado estricto (`(p:any)`), `<ReactECharts notMerge>`, paleta desde `lib/colors`. Reusar `PanelCard` para envolver cuando aplique, o tarjetas propias `bg-paper border border-gray-200 rounded-lg`.

---

## Task 1: Barra de filtros global (incluye fecha)

**Files:** Create `GlobalFilterBar.tsx`; Modify `Layout.tsx`, `Explorador.tsx` (quitar FilterPanel inline).

- [ ] **Step 1: Crear `GlobalFilterBar.tsx`**

Componente que usa `useFilters()` y `options`. Controles:
- Fecha: dos `<input type="date">` ligados a `filters.desde` y `filters.hasta`, con `min`/`max` = `options.rango_fechas.desde/hasta`. onChange → `setFilters({ desde/hasta: value || null })`.
- Región: `<select>` (Todas + options.regiones) → `setFilters({ region })`.
- Categoría: `<select>` (Todas + options.categorias) → `setFilters({ categoria })`.
- Estado: `<select>` (Entregados=delivered / Todos=all) → `setFilters({ estado_pedido })`.
- Botón "↺ Limpiar" → `reset()`.
- Pills de filtros activos removibles (región, categoría, fecha, estado≠delivered).

Estilo: barra horizontal `bg-paper border-b border-gray-200 px-6 py-3 sticky top-0 z-10`, tipografía Inter/IBM Plex, controles con `border border-gray-200 rounded`. Modelar el markup en el `FilterPanel.tsx` existente (mismas clases Tailwind), pero compacto y horizontal.

- [ ] **Step 2: Montar en `Layout.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalFilterBar from "./GlobalFilterBar";

export default function Layout() {
  return (
    <div className="grid grid-cols-[220px_1fr] min-h-screen bg-bg">
      <Sidebar />
      <main className="overflow-x-auto">
        <GlobalFilterBar />
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Quitar el FilterPanel inline del Explorador**

En `views/Explorador.tsx`, eliminar el `<FilterPanel />` y su import (los filtros ahora son globales). Mantener el resto (header, KpiRow, grilla). Borrar `components/explorador/FilterPanel.tsx` (ya no se usa) — verificar que nada más lo importe (`grep -rn FilterPanel frontend/src`).

- [ ] **Step 4: Verificar** `npx tsc -b --noEmit` OK. En navegador: la barra de filtros aparece arriba en todas las vistas; cambiar región/fecha recalcula el Explorador.

- [ ] **Step 5: Commit** `feat: barra de filtros global en Layout (fecha/región/categoría/estado)`

---

## Task 2: `DataTable` genérico ordenable

**Files:** Create `DataTable.tsx`.

- [ ] **Step 1: Crear el componente**

```tsx
import { useMemo, useState } from "react";

export type Column<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "right";
  format?: (v: any, row: T) => React.ReactNode;
};

export default function DataTable<T extends Record<string, any>>({
  rows, columns, initialSort, maxRows,
}: { rows: T[]; columns: Column<T>[]; initialSort?: keyof T & string; maxRows?: number }) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort ?? null);
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const r = [...rows];
    if (sortKey) r.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return maxRows ? r.slice(0, maxRows) : r;
  }, [rows, sortKey, dir, maxRows]);

  const toggle = (k: string) => {
    if (sortKey === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setDir("desc"); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((c) => (
              <th key={c.key} onClick={() => toggle(c.key)}
                className={`py-2 px-2 font-mono text-[11px] uppercase tracking-wide text-gray cursor-pointer hover:text-ink ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.label}{sortKey === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-bg">
              {columns.map((c) => (
                <td key={c.key} className={`py-2 px-2 ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}>
                  {c.format ? c.format(row[c.key], row) : String(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2:** `npx tsc -b --noEmit` OK.
- [ ] **Step 3: Commit** `feat: DataTable genérico ordenable`

---

## Task 3: Vista P1 — Rentabilidad

**Endpoint:** `GET /api/p1/categorias` → `categoria, pedidos, unidades_vendidas, ingreso_total, ticket_promedio, flete_pct, pct_puntual, pct_resenas_malas, pct_ingreso, pct_acumulado, pareto`.

**Files:** Create `components/views/p1/ScatterTrampa.tsx`, `ParetoCategorias.tsx`; replace `views/Rentabilidad.tsx`.

Contenido de la vista (rúbrica-óptimo):
- **KPIs (4):** Ingreso total (sum ingreso_total), Catálogo (count categorías), Categorías trampa (count flete_pct≥35), Categoría líder (max pct_ingreso → nombre + %). Calcular en cliente desde el array.
- **ScatterTrampa:** modelar en `MatrizRentabilidad.tsx`; x=`pct_resenas_malas`, y=`flete_pct`, size=`ingreso_total`, color rojo si `flete_pct≥35 && pct_resenas_malas≥15` (trampa), verde si ambos bajos, azul resto. Altura ~360px. Línea de referencia en y=35 (zona trampa).
- **ParetoCategorias:** barras horizontales top-10 por `pct_ingreso` + línea `pct_acumulado` (echarts bar+line, dual axis). Altura ~340px.
- **DataTable:** todas las categorías; columnas: Categoría, Pedidos, Ingreso (fmtCurrencyShort), % ingreso, % acum, Flete % (rojo si ≥35), % reseñas malas, % puntual. initialSort `ingreso_total`.
- **Insight (HeroBanner o bloque):** "El 80/20 es suave y el flete envenena al top: N categorías (flete>35%) erosionan margen."

- [ ] Step 1: `ScatterTrampa.tsx` (modelar en MatrizRentabilidad, full-size, sin PanelCard wrapper — tarjeta propia). tsc OK. Commit.
- [ ] Step 2: `ParetoCategorias.tsx` (bar horizontal + line acumulado). tsc OK. Commit.
- [ ] Step 3: `Rentabilidad.tsx` componiendo KPIs + los 2 charts + DataTable + insight, leyendo `useApi("/api/p1/categorias")` una vez y pasando rows a los hijos por props (evita 3 fetches). tsc OK. Verificar en navegador `/rentabilidad`. Commit `feat: vista P1 Rentabilidad funcional`.

---

## Task 4: Vista P2 — Retención

**Endpoints:** `GET /api/p2/segmentos` (segmento, clientes, ingreso, ticket_avg, recency_avg, frequency_avg, pct_clientes, pct_ingreso), `GET /api/p2/recompra` (clientes_unicos, una_compra, recurrentes, tasa_recompra_pct, clv_aprox).

**Files:** Create `components/views/p2/SegmentosBar.tsx`; replace `views/Retencion.tsx`.

Contenido:
- **KPIs (4):** Clientes únicos (recompra.clientes_unicos), Tasa recompra % (recompra.tasa_recompra_pct, tone bad si <10), One-time (recompra.una_compra → % sobre clientes_unicos), CLV aprox (recompra.clv_aprox, fmtCurrencyShort).
- **TreemapRFM:** reutilizar el componente existente `explorador/charts/TreemapRFM.tsx` (ya lee /p2/segmentos) — renderizarlo a mayor altura envolviéndolo o copiándolo full-size como `SegmentosTreemap`. Decisión: copiar a `views/p2/` con altura 340px para no alterar el del Explorador.
- **SegmentosBar:** barras horizontales por segmento mostrando `pct_clientes` vs `pct_ingreso` (dos series) — revela el desbalance (pocos clientes / mucho ingreso). Altura ~320px.
- **DataTable:** segmentos; cols: Segmento, Clientes, % clientes, Ingreso, % ingreso, Ticket avg, Recencia avg.
- **Insight:** "La oportunidad no es retener al X% recurrente, es convertir al Y% one-time."

- [ ] Step 1: `SegmentosBar.tsx` (bar horizontal 2 series pct_clientes/pct_ingreso). tsc. Commit.
- [ ] Step 2: `Retencion.tsx` componiendo KPIs (2 fetches: segmentos + recompra) + treemap full-size + SegmentosBar + DataTable + insight. tsc OK. Navegador `/retencion`. Commit `feat: vista P2 Retención funcional`.

---

## Task 5: Vista P3 — Logística

**Endpoints:** `GET /api/p3/kpis` (pedidos, tiempo_promedio, pct_puntual, retraso_avg_atrasados, pct_retraso_critico), `GET /api/p3/regiones` (region, pedidos, retraso_avg, pct_puntual), `GET /api/p3/satisfaccion_vs_retraso` (bucket_retraso, pedidos, rating_avg, pct_malas), `GET /api/p3/rutas` (origen, destino, regiones, pedidos, dias_entrega_avg, retraso_avg, pct_puntual, pct_retraso_critico).

**Files:** Create `components/views/p3/RetrasoSatisfaccion.tsx`, `RegionesBar.tsx`; replace `views/Logistica.tsx`.

Contenido:
- **KPIs (4):** % puntual (kpis.pct_puntual, tone good si≥90), Tiempo prom. entrega (kpis.tiempo_promedio + " días"), Retraso crítico % (kpis.pct_retraso_critico, tone bad), Pedidos analizados (kpis.pedidos).
- **RetrasoSatisfaccion** (el cruce estrella): de `satisfaccion_vs_retraso`, eje x = bucket_retraso, barras = pct_malas + línea = rating_avg (dual axis). Muestra que a más retraso, peor rating. Altura ~340px.
- **RegionesBar:** de `regiones`, barras por región mostrando retraso_avg (o pct_puntual), color por severidad. Altura ~300px. (Reutilizar idea de MapaRegiones pero como barras es más legible aquí; el tile-map del Explorador ya cubre lo geográfico.)
- **DataTable** (rutas problemáticas): top rutas por retraso; cols: Ruta (origen→destino), Región destino, Pedidos, Días entrega, % puntual, % retraso crítico. initialSort `retraso_avg`, maxRows 15.
- **Insight:** "La intuición geográfica está mal calibrada: Nordeste castiga más que Norte."

- [ ] Step 1: `RetrasoSatisfaccion.tsx` (bar pct_malas + line rating_avg). tsc. Commit.
- [ ] Step 2: `RegionesBar.tsx`. tsc. Commit.
- [ ] Step 3: `Logistica.tsx` (3 fetches: kpis, satisfaccion_vs_retraso, regiones, rutas — 4) componiendo todo. tsc OK. Navegador `/logistica`. Commit `feat: vista P3 Logística funcional`.

---

## Task 6: Vista P4 — Vendedores

**Endpoints:** `GET /api/p4/semaforo` (clasificacion, vendedores, ingreso, rating_avg, puntualidad_avg, pct_vendedores, pct_ingreso), `GET /api/p4/scatter` (id_vendedor, region, pedidos, ingreso, puntualidad, rating, clasificacion), `GET /api/p4/top?tipo=peores&n=10`.

**Files:** Create `components/views/p4/ScatterVendedores.tsx`, `SemaforoBar.tsx`; replace `views/Vendedores.tsx`.

Contenido:
- **KPIs (4):** Vendedores activos (sum semaforo.vendedores), % Críticos (semaforo Crítico.pct_vendedores, tone bad), % Ingreso Críticos (semaforo Crítico.pct_ingreso), Top crítico ingreso (max ingreso entre top peores → fmtCurrencyShort).
- **ScatterVendedores:** modelar en `CuadranteVendedores.tsx`, full-size (~360px); x=puntualidad×100, y=rating, size=ingreso, color=clasificacion. Zona tóxica sombreada (ingreso alto + rating<3.5).
- **SemaforoBar:** de `semaforo`, por clasificación 2 barras: pct_vendedores vs pct_ingreso (revela "pocos críticos, X% del ingreso"). Colores semáforo. Altura ~300px.
- **DataTable** (top 10 críticos): de `/p4/top?tipo=peores&n=10`; cols: id_vendedor (truncado), Región, Ingreso, Pedidos, Rating, % puntual, % malas, Clasificación. Razón crítico derivada en cliente (rating<3.5 → "Calidad", puntualidad<0.8 → "Tiempo").
- **Insight:** "Calidad ≠ Escala: críticos (X%) concentran Y% del ingreso."

- [ ] Step 1: `ScatterVendedores.tsx`. tsc. Commit.
- [ ] Step 2: `SemaforoBar.tsx`. tsc. Commit.
- [ ] Step 3: `Vendedores.tsx` (3 fetches: semaforo, scatter, top peores). tsc OK. Navegador `/vendedores`. Commit `feat: vista P4 Vendedores funcional`.

---

## Task 7: Vista P5 — Satisfacción

**Endpoints:** `GET /api/p5/distribucion` ({distribucion:[{score,satisfaccion,n,pct}], nps_estimado, total_resenas}), `GET /api/p5/evolucion` (anio, mes, rating, resenas, pct_malas, periodo), `GET /api/p5/palabras?tipo=negativas&top=12` ([{termino, frecuencia}]).

**Files:** Create `components/views/p5/DistribucionRating.tsx`, `EvolucionRating.tsx`, `PalabrasBar.tsx`; replace `views/Satisfaccion.tsx`.

Contenido:
- **KPIs (4):** Reseñas totales (distribucion.total_resenas), NPS (distribucion.nps_estimado, tone warn), % positivas (suma pct score≥4, tone good), % negativas (suma pct score≤2, tone bad).
- **DistribucionRating:** barras por score 1-5 con `n`/`pct`, colores rojo(1-2)/gris(3)/verde(4-5). Altura ~320px.
- **EvolucionRating:** línea+área mensual de `rating` (y eje secundario `pct_malas`), de `/p5/evolucion`. periodo en x. Altura ~320px.
- **PalabrasBar:** barras horizontales top-12 palabras negativas (`termino`/`frecuencia`), de `/p5/palabras?tipo=negativas`. Altura ~340px.
- **Insight:** "No es 'mejorar satisfacción': las quejas se agrupan en causas concretas (top palabras: …)."

- [ ] Step 1: `DistribucionRating.tsx`. tsc. Commit.
- [ ] Step 2: `EvolucionRating.tsx`. tsc. Commit.
- [ ] Step 3: `PalabrasBar.tsx`. tsc. Commit.
- [ ] Step 4: `Satisfaccion.tsx` (3 fetches). tsc OK. Navegador `/satisfaccion`. Commit `feat: vista P5 Satisfacción funcional`.

---

## Task 8: Verificación end-to-end

- [ ] Step 1: `npx tsc -b --noEmit` y `npm run build` → ambos OK.
- [ ] Step 2: En navegador recorrer las 6 vistas (Explorador + P1-P5): todas renderizan KPIs, gráficos y tablas con datos reales.
- [ ] Step 3: Aplicar un filtro global (ej. región=Sudeste, o un rango de fechas) y confirmar que **todas** las vistas recalculan. Confirmar por API: `curl -s "http://127.0.0.1:8000/api/p1/categorias?region=Sudeste" | python3 -c "import sys,json;print(len(json.load(sys.stdin)),'categorías')"` cambia respecto a sin filtro.
- [ ] Step 4: Confirmar que cada KPI/gráfico es trazable a su problemática (criterio 6 + regla de trazabilidad). Commit final si hubo ajustes.

---

## Self-Review (cobertura rúbrica criterio 6)

- 5 vistas funcionales (Resumen ya existe; P1-P5 ahora reales) ✓
- Cada KPI responde a una problemática (etiquetado por vista) ✓
- Filtros operativos fecha/región/categoría (GlobalFilterBar, Task 1) ✓ — cierra el gap de FECHA de la rúbrica
- Diseño ejecutivo navegable con contexto (insight por vista) ✓
- Diferido (no exigido por rúbrica): matriz RFM 5×5, bigramas, Lannister, choropleth por estado — documentado.
