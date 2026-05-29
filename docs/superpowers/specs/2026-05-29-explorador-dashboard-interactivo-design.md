# Spec — Vista "Explorador" (dashboard interactivo tipo Power BI)

**Fecha:** 2026-05-29
**Proyecto:** Olist BI Suite (Big Data Analysis)
**Autor:** Manuel Merino (+ equipo)
**Estado:** Aprobado para implementación

---

## 1. Objetivo

Agregar al dashboard React una **vista "Explorador"**: un tablero ejecutivo interactivo, al estilo Power BI / Tableau, donde el usuario aplica **filtros globales** (fecha, región, categoría, estado del pedido) y todos los KPIs y gráficos se **recalculan en vivo** contra la base de datos. La vista es el "mapa de mando" del negocio: cada problema (P1–P5) se sintetiza en un gráfico avanzado, y desde cada panel se puede **profundizar** en la sección detallada correspondiente.

### Por qué
- El profesor evalúa pensamiento de consultor; un tablero filtrable en vivo demuestra control real de los datos, no una "foto".
- La infraestructura de filtrado ya existe en el backend (todos los endpoints aceptan los filtros globales) y el frontend ya tiene `FiltersContext` + sidebar de filtros. El costo marginal de un explorador potente es bajo.

### Criterios de éxito
1. Al cambiar cualquier filtro del panel, los **6 KPIs y los 5 gráficos** se actualizan con datos reales.
2. Cada uno de los 5 paneles tiene un enlace "Profundizar →" que navega a su vista de problema (P1–P5).
3. La estética sigue la paleta corporativa navy (Inter, sobrio, denso, estilo consultora).
4. No se rompe ninguna de las 6 vistas existentes.

---

## 2. Alcance

### Dentro
- Nueva vista React `Explorador` como primer ítem del sidebar y landing por defecto.
- Panel de filtros globales (fecha, región multi-select, categoría, estado) cableado a `FiltersContext`.
- Fila de 6 KPIs.
- 5 paneles de problema, cada uno con un gráfico avanzado + enlace "Profundizar →".
- Alinear `frontend/src/lib/colors.ts` a la paleta navy corporativa (corrige la inconsistencia morado/verde actual).
- 3 ajustes menores de backend (ver §5).

### Fuera (YAGNI)
- **Cross-filtering** por clic en elementos del gráfico (mejora futura).
- **Mapa coroplético real de Brasil** (v1 usa tile-map por región; el mapa con silueta + topojson queda como mejora opcional).
- Reescritura de las 5 vistas de problema (siguen como están; sólo se enlazan).
- Export a PDF/PNG, autenticación, despliegue.

---

## 3. Arquitectura

```
Sidebar (filtros globales) ──► FiltersContext ──► querystring ?desde&hasta&region&categoria&estado_pedido
                                                       │
        ┌──────────────────────────────────────────────┼─────────────────────────────────┐
        ▼                  ▼              ▼              ▼              ▼                   ▼
 resumen/kpis      p1/categorias   p2/segmentos    p3/rutas      p4/top            p5/distribucion
   (6 KPIs)        (matriz P1)     (treemap P2)   (tile-map P3)  (cuadrante P4)    (divergente+NPS P5)
```

- **Frontend:** Vite + React + TS + Tailwind + **Recharts** (ya en el stack). React Router para la navegación a las secciones.
- **Backend:** FastAPI existente; los endpoints ya aplican `where_clause(Filters)`.
- **Estado de filtros:** `FiltersContext` (ya existe). El panel del Explorador es otra UI sobre el mismo contexto que ya usa el sidebar; se mantiene una sola fuente de verdad de filtros.

---

## 4. Componentes (UI)

Referencia visual aprobada: mockups `cockpit-v4.html` (layout) y `filtros-v5.html` (panel de filtros) en `.superpowers/brainstorm/`.

### 4.1 Panel de filtros (global)
- Rango de fechas (slider o date pickers) → `desde`/`hasta`.
- Región: multi-select de chips (Norte, Nordeste, Centro-Oeste, Sudeste, Sur) → `region`.
  - Nota: el backend hoy filtra por **una** región (`region=`). Para multi-select v1 se permite seleccionar una a la vez **o** se manda la primera; multi-región real es ajuste menor opcional (ver §5). Decisión v1: **single-select de región** presentado como chips (comportamiento idéntico al backend actual), para no inflar alcance.
- Categoría: dropdown (las ~70 categorías en español desde `/api/filtros`).
- Estado del pedido: toggle (Entregados por defecto / Todos).
- Pills de "filtros activos" removibles + botón "Limpiar".

### 4.2 Fila de 6 KPIs
Desde `resumen/kpis`: Ingreso total, Pedidos, Ticket promedio, % Puntualidad, Rating promedio, NPS.
Cada card: etiqueta, valor (números tabulares), y opcionalmente un delta. (El delta vs. periodo previo es **opcional**; si no hay endpoint que lo entregue, se omite — no se inventa el dato.)

### 4.3 Cinco paneles de problema

| Panel | Gráfico | Endpoint | Campos usados | Profundizar → |
|---|---|---|---|---|
| **P1 Rentabilidad** | Matriz burbuja (scatter) | `GET /api/p1/categorias` | x=`pct_resenas_malas`, y=`flete_pct`, tamaño=`ingreso_total`, color=`pareto`/heurística trampa | `/rentabilidad` |
| **P2 Retención** | Treemap | `GET /api/p2/segmentos` | área=`ingreso`, etiqueta=`segmento`, %=`pct_ingreso` | `/retencion` |
| **P3 Logística** | Tile-map 5 regiones | `GET /api/p3/rutas` | agrupar por `destino_region`, color=`retraso_avg` (o 1-`pct_puntual`) | `/logistica` |
| **P4 Vendedores** | Cuadrante (scatter) | `GET /api/p4/top?n=<grande>` | x=`puntualidad`, y=`rating`, tamaño=`ingreso`, color=`clasificacion` | `/vendedores` |
| **P5 Satisfacción** | Barra divergente + gauge NPS | `GET /api/p5/distribucion` | `distribucion[]` (scores 1-5), `nps_estimado` | `/satisfaccion` |

Cada panel: badge del problema, título, gráfico, una línea de metadato (qué codifica el gráfico), y el enlace "Profundizar →".

### 4.4 Estados por panel
Cada panel maneja **cargando / vacío / error** de forma independiente: si un endpoint falla o devuelve vacío (p. ej. un filtro sin datos), ese panel muestra su estado y **el resto del tablero sigue funcionando**.

---

## 5. Ajustes de backend (menores)

1. **P4 cuadrante:** `p4/top` hoy devuelve sólo el top-N. Para el scatter se necesita una muestra amplia de vendedores. Opción A: llamar con `n` grande (p.ej. 300). Opción B: añadir `GET /api/p4/scatter` que devuelva vendedores con `puntualidad,rating,ingreso,clasificacion` (con un mínimo de pedidos para evitar ruido). **Decisión:** Opción B si A trae demasiado ruido; empezar por A.
2. **P3 tile-map:** agregar `retraso_avg`/`pct_puntual` por **región de destino**. Se puede calcular en el cliente a partir de `p3/rutas`, o añadir `GET /api/p3/regiones`. **Decisión:** agregación en cliente v1; endpoint si la lógica se complica.
3. **Región multi-select (opcional):** si se quiere multi-región real, `where_clause` debe aceptar lista (`region IN (...)`). **Fuera de v1** salvo que sobre tiempo.

Ninguno de estos toca el modelo de datos ni el ETL.

---

## 6. Mejora incluida: paleta

`frontend/src/lib/colors.ts` se realinea a la paleta navy corporativa:
- primario `#27295a`, medio `#304b9a`, acento `#3c78bb`, claro `#85B7EB`.
- Semánticos sobrios: verde `#2f7d5b` (bueno), ámbar `#b27a1a` (alerta), rojo `#b5453c` (crítico).
- Mantener coherencia con `tailwind.config.js`, que ya define `navy/navy-medium/blue-accent`.

Esto corrige la inconsistencia actual (charts en morado/verde vs. layout navy) y aplica a **todas** las vistas, no sólo al Explorador.

---

## 7. Verificación

1. **Smoke por panel:** cada endpoint responde con datos y el gráfico renderiza (incluye verificación con `curl` + carga en navegador).
2. **Test de reactividad (clave):** aplicar un filtro (p.ej. `region=Sudeste`) y confirmar que los 6 KPIs **y** los 5 gráficos cambian respecto al estado sin filtro.
3. **Test de navegación:** clic en "Profundizar →" de cada panel lleva a la vista correcta.
4. **Test de robustez:** un filtro sin datos no rompe el tablero (paneles muestran estado vacío).

---

## 8. Dependencias / supuestos

- Docker (`sqlserver`), backend FastAPI (:8000) y frontend Vite (:5173) corriendo. Procedimiento en `olist_dashboard/CONTEXT.md §8`.
- Recharts ya instalado. **Sin** dependencias nuevas en v1 (el tile-map se hace con SVG/divs; el mapa real de Brasil quedaría para una mejora con `react-simple-maps`).
- Los endpoints existentes siguen el contrato verificado el 2026-05-29 (ver §4.3).
