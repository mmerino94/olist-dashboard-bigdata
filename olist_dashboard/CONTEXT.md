# Olist BI Suite — Contexto del proyecto

> Documento de handoff. Captura todo lo que se construyó en la sesión del **9 de mayo de 2026** para que cualquier integrante del equipo (o yo en una próxima sesión) pueda retomar sin contexto previo.

---

## 1. El proyecto

**Curso:** Big Data Analysis
**Caso de estudio:** Dataset Olist Brazilian E-Commerce (Kaggle, ~100k órdenes 2016-2018)
**Marco:** Consultoría analítica para una empresa peruana de e-commerce (Falabella, Linio, Rappi, MercadoLibre).
**Filosofía del docente:** El valor está en la decisión que el modelo habilita, no en el modelo. Las recomendaciones deben ser **accionables y cuantificadas**, no descriptivas.

### Equipo
- Rios Chiuca, Jaime Arturo
- Huaman Llanos, Felix Moises
- Merino Huaman, Manuel
- Montes Quispe, Adrian Guido

### Los 5 problemas de negocio
| # | Problema | Pregunta central |
|---|----------|------------------|
| 1 | Rentabilidad por categoría | ¿Qué nos genera dinero y qué nos lo quita? |
| 2 | Retención de clientes | ¿Por qué no regresan? RFM + segmentación. |
| 3 | Tiempos de entrega | ¿Dónde se concentran los retrasos? |
| 4 | Desempeño de vendedores | ¿Quiénes dañan la reputación de la plataforma? |
| 5 | Causas de insatisfacción | ¿Por qué se quejan? Análisis de texto de reseñas. |

### Estado de entregables (según docente)
| Entregable | Peso | Estado |
|---|---|---|
| 1. Diagnóstico de calidad | 10% | ✅ Implícito en ETL |
| 2. Modelo de datos + ETL | 20% | ✅ DDL + ETL Python en SQL Server |
| 3. Dashboard ejecutivo | 25% | ✅ React + 6 vistas |
| 4. Reporte ejecutivo (≤12 pág) | 25% | ⏳ Pendiente (Avance 2) |
| 5. Presentación oral | 20% | ⏳ Pendiente |

### Avance 1 (ya entregado el 25-abr-2026)
Documento LaTeX en `bidgata_avance/avance1_bd/`:
- 21 KPIs agrupados por problema
- Modelo conceptual (TikZ)
- Modelo lógico estrella (TikZ)
- Modelo físico starflake (PDF + DDL SQL Server)

⚠ El PDF entregado tiene **gaps técnicos** identificados en esta sesión (ver §3). Por decisión del usuario, **no se actualiza el `main.tex` por ahora** — los fixes viven en el código del dashboard. Se actualizará cuando se entregue Avance 2.

---

## 2. Arquitectura final del dashboard

```
┌─ React (Vite + TS + Tailwind + Recharts) ── http://localhost:5175 ──┐
│   ├ Sidebar con filtros globales (fecha, región, categoría)        │
│   └ 6 vistas: Resumen + 5 problemas                                 │
└──────────── /api/* (proxy Vite → 8000) ────────────────────────────┘
                          ↓
┌─ FastAPI (Python) ──────── http://localhost:8000 ──────────────────┐
│   └ 16 endpoints, 7 routers, filtros compartidos                   │
└──────────── pymssql + SQLAlchemy ──────────────────────────────────┘
                          ↓
┌─ SQL Server (Azure SQL Edge en Docker) ─── localhost:1433 ─────────┐
│   └ OlistDW: 8 tablas, 363,068 filas total                         │
└────────────────────────────────────────────────────────────────────┘
```

### Decisiones que se tomaron
- **BD:** SQL Server (lo pide el docente). Container `sqlserver` ya existía.
- **ETL:** Python + pandas + SQLAlchemy + pymssql. Drop + create + load full refresh.
- **Backend:** FastAPI (Python, reutiliza lógica del Streamlit existente).
- **Frontend:** Vite + React + TS + TailwindCSS + Recharts + React Router.
- **Streamlit (`proyectobigdata/`):** se reemplaza por React, no se entrega.

---

## 3. Correcciones al modelo del Avance 1

Tres gaps detectados en el modelo del PDF entregado y corregidos en el código:

### Gap 1 — `id_pedido` faltante en FACT_VENTAS
**Síntoma:** No se podía hacer `COUNT(DISTINCT id_pedido)`, lo que bloqueaba "ticket promedio", "% pedidos con problemas" y la frecuencia de RFM.
**Fix:** Agregada columna `id_pedido VARCHAR(50)` como **degenerate dimension**. Bonus: también se agregó `estado_pedido VARCHAR(20)` para filtrar por delivered/canceled.

### Gap 2 — Texto de reseñas no estaba en el modelo
**Síntoma:** El docente pide explícitamente análisis de palabras frecuentes en reseñas negativas para P5. El Avance 1 solo tenía el flag `escribio_comentario`.
**Fix:** Nueva tabla **`DIM_RESENA`** con grano pedido, incluyendo `comentario_titulo NVARCHAR(200)` y `comentario_texto NVARCHAR(MAX)`.

### Gap 3 — Reseñas materializadas a grano ítem
**Síntoma:** Una reseña aplica a un pedido entero, pero al replicarla en cada ítem un pedido con 3 ítems pesaba 3× en los promedios.
**Fix:** Reseñas removidas de FACT_VENTAS y vivas en DIM_RESENA. Se acceden via `LEFT JOIN ON id_pedido`.

### Otros ajustes técnicos
- `ciudad` y `categoria` cambiados de `VARCHAR` a `NVARCHAR` para preservar Unicode (ã, ç, etc).
- Documentado que `DIM_TIEMPO` mapea `order_purchase_timestamp`.
- Índices secundarios en `id_pedido`, `id_cliente`, `estado_pedido`, `categoria`, `puntuacion_review`, `satisfaccion`.

---

## 4. Estructura del repo

```
ProyectoFinal/
├── AvanceBigData.pdf                  # Avance 1 entregado (versión vieja, 23-abr)
├── Proyecto_1_BD.docx                 # Enunciado oficial del docente
│
├── bidgata_avance/                    # Fuente LaTeX del Avance 1
│   └── avance1_bd/
│       ├── main.tex                   # ⚠ NO TOCAR sin pedir permiso
│       ├── main.pdf                   # Versión 25-abr (la buena)
│       └── figuras/modelo_fisico_mejorado.pdf
│
├── proyectobigdata/                   # Streamlit antiguo (reemplazado, no se entrega)
│   ├── app.py
│   ├── data/                          # 9 CSVs Olist (esta es la fuente)
│   └── src/                           # transform.py, kpis.py reutilizados
│
└── olist_dashboard/                   # ★ TRABAJO ACTIVO
    ├── CONTEXT.md                     # este archivo
    ├── requirements.txt
    ├── .venv/                         # Python 3.12 venv
    │
    ├── db/
    │   └── schema.sql                 # DDL corregido
    │
    ├── etl/
    │   ├── config.py                  # credenciales BD + REGION_BY_STATE map
    │   └── load.py                    # ETL completo (~340 líneas, 141s ejecución)
    │
    ├── backend/                       # FastAPI
    │   ├── main.py                    # app + CORS + router includes
    │   ├── db.py                      # SQLAlchemy engine
    │   ├── filters.py                 # filtros globales reutilizables
    │   └── routes/
    │       ├── filtros.py
    │       ├── resumen.py
    │       ├── p1_rentabilidad.py
    │       ├── p2_retencion.py
    │       ├── p3_logistica.py
    │       ├── p4_vendedores.py
    │       └── p5_satisfaccion.py
    │
    └── frontend/                      # Vite + React + TS
        ├── package.json
        ├── tailwind.config.js
        ├── vite.config.ts             # proxy /api → :8000
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx                # rutas
            ├── index.css              # Tailwind
            ├── api/client.ts          # useApi hook
            ├── lib/
            │   ├── filters.tsx        # FiltersContext + Provider
            │   ├── format.ts
            │   └── colors.ts
            ├── components/
            │   ├── Layout.tsx
            │   ├── Sidebar.tsx        # nav + filtros globales
            │   ├── KpiCard.tsx
            │   └── ChartCard.tsx
            └── views/
                ├── Resumen.tsx
                ├── Rentabilidad.tsx   # P1
                ├── Retencion.tsx      # P2
                ├── Logistica.tsx      # P3
                ├── Vendedores.tsx     # P4
                └── Satisfaccion.tsx   # P5
```

---

## 5. Modelo físico (versión corregida)

### DIM_TIEMPO
PK `id_tiempo INT` formato YYYYMMDD · fecha · año · mes · trimestre · dia_semana · es_fin_semana

### DIM_GEOGRAFIA (role-playing dim)
PK `id_geografia INT IDENTITY` · zip_prefix · **ciudad NVARCHAR** · estado · region · lat · lon
UNIQUE(zip_prefix, ciudad, estado)

### DIM_CLIENTE
PK `id_cliente VARCHAR(50)` (customer_id Olist) · customer_unique_id · FK id_geografia

### DIM_VENDEDOR
PK `id_vendedor VARCHAR(50)` · FK id_geografia

### DIM_PRODUCTO
PK `id_producto VARCHAR(50)` · **categoria NVARCHAR(60)** · rango_precio · peso · alto · ancho · largo

### DIM_PAGO
PK `id_pago INT IDENTITY` · tipo_pago · num_cuotas

### DIM_RESENA ★ NUEVA
PK `id_resena VARCHAR(50)` · UNIQUE id_pedido · puntuacion_review · satisfaccion · escribio_comentario · **comentario_titulo NVARCHAR(200)** · **comentario_texto NVARCHAR(MAX)** · fecha_creacion · fecha_respuesta

### FACT_VENTAS (grano: ítem vendido)
PK `id_item_venta INT IDENTITY` · **id_pedido VARCHAR(50)** · **estado_pedido VARCHAR(20)** · 5 FK estándar + 2 FK role-playing geografia · precio · flete · valor_total · flete_sobre_precio · dias_hasta_entrega · dias_retraso · entrego_a_tiempo

### Volúmenes finales
```
DIM_TIEMPO         634
DIM_GEOGRAFIA   15,249
DIM_CLIENTE     99,441
DIM_VENDEDOR     3,095
DIM_PRODUCTO    32,951
DIM_PAGO            28
DIM_RESENA      98,116   ← nueva
FACT_VENTAS    112,554
TOTAL          362,068
```

---

## 6. Endpoints del backend (16)

| Método | Path | Devuelve |
|---|---|---|
| GET | `/api/filtros` | rangos de fechas, regiones, categorías, estados disponibles |
| GET | `/api/resumen/kpis` | 7 KPIs ejecutivos |
| GET | `/api/resumen/evolucion` | serie mensual de pedidos / ingreso / rating |
| GET | `/api/p1/categorias` | ranking + Pareto + reseñas malas |
| GET | `/api/p1/forma_pago` | breakdown por tipo de pago |
| GET | `/api/p2/recompra` | KPIs de retención |
| GET | `/api/p2/segmentos` | RFM agrupado (VIP/Frecuentes/En riesgo/Dormidos/Perdidos) |
| GET | `/api/p3/kpis` | tiempo entrega, puntualidad, retraso crítico |
| GET | `/api/p3/rutas` | top rutas con peor desempeño |
| GET | `/api/p3/satisfaccion_vs_retraso` | buckets de retraso vs rating/% malas |
| GET | `/api/p4/semaforo` | distribución Elite/Estándar/Observación/Crítico |
| GET | `/api/p4/top?tipo=mejores\|peores&n=10` | ranking individual de vendedores |
| GET | `/api/p5/distribucion` | scores 1-5 + NPS |
| GET | `/api/p5/evolucion` | rating mensual |
| GET | `/api/p5/palabras?tipo=negativas\|positivas&top=20` | frecuencias de palabras |

**Filtros globales (querystring) aceptados por casi todos:**
`?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&region=Sudeste&categoria=health_beauty&estado_pedido=delivered`

Docs interactivas (Swagger): http://localhost:8000/docs

---

## 7. Hallazgos accionables (data del 2016-2018)

### Resumen ejecutivo
- 96,399 pedidos · R$15.4M · ticket avg R$160 · 93.4% puntualidad · rating 4.08

### P1 — Rentabilidad
- Top 5: health_beauty, watches_gifts, bed_bath_table, sports_leisure, computers_accessories.
- watches_gifts tiene el ticket promedio más alto (R$230).
- Categorías con más reseñas malas: bed_bath_table (18%), housewares (15%).

### P2 — Retención (CRÍTICO)
- **Solo 3% de tasa de recompra** (90,488 únicas vs 2,797 recurrentes).
- VIP = 6.9% de clientes generan 13.1% del ingreso.
- Perdidos = 30.7% de clientes (la mayor cohorte).

### P3 — Logística (cruce más fuerte del dataset)
| Retraso | Rating | % Reseñas malas |
|---|---|---|
| A tiempo | 4.21 | 11% |
| 1-3 días | 3.23 | 34% |
| 4-7 días | 2.09 | 68% |
| 8-14 días | 1.68 | 80% |

### P4 — Vendedores
- 698 Elite (39.5%) · 839 Estándar (47.5%) · 198 En observación (11.2%) · **30 Críticos (1.7%)**.
- Estándar concentra 74.2% del ingreso.

### P5 — Satisfacción
- NPS estimado: **42.9**
- 57.6% reseñas con 5 estrellas · 14.7% con 1-2 (malas)
- Top palabras negativas: **recebi, entregue, ainda, chegou, prazo** → todas relacionadas con entrega → confirma que P5 está dominado por P3.

---

## 8. Cómo arrancarlo en una sesión nueva

### Credenciales
**SQL Server SA password:** `TuClaveFuerte123!` (hardcoded en `etl/config.py`)
La encontramos en las env vars del contenedor Docker, no fue necesario resetearla.

### Tres terminales

```bash
cd "/Users/manuelmerino/Documents/Documentos - MacBook Air de Manuel/Agentes Claude Code/BigDataAnalysis/ProyectoFinal/olist_dashboard"

# Terminal 1 — asegurar que Docker está arriba
docker start sqlserver

# Terminal 2 — backend
cd backend && ../.venv/bin/uvicorn main:app --port 8000

# Terminal 3 — frontend
cd frontend && npm run dev
```

Abrir: **http://localhost:5175** (puerto puede variar si está ocupado, ver salida de Vite).

### Recargar datos desde cero

```bash
cd olist_dashboard && .venv/bin/python etl/load.py
```

(Tarda ~140s. Hace `DROP DATABASE OlistDW` y reload completo desde los CSVs en `proyectobigdata/data/`.)

### Verificación rápida

```bash
# BD
docker exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'TuClaveFuerte123!' \
    -Q "SELECT COUNT(*) FROM OlistDW.dbo.FACT_VENTAS"

# Backend
curl http://localhost:8000/api/resumen/kpis | python3 -m json.tool

# Frontend (busca el puerto en la salida de npm run dev)
open http://localhost:5175
```

---

## 9. Lo que queda pendiente

### Para Avance 2 (académico)
- Escribir reporte ejecutivo (≤12 páginas, ya tenemos los hallazgos del §7).
- Reflexión "para mercado peruano" en cada problema.
- Sección "Próximos pasos y Big Data" (1 tabla: limitación → solución con Big Data).
- Preparar slides + demo en vivo del dashboard (12 min + 8 Q&A).
- **Actualizar `main.tex`** con los fixes del §3 (id_pedido, DIM_RESENA, NVARCHAR).

### Mejoras opcionales del dashboard
- Mapa coroplético de Brasil para P3 (react-simple-maps + topojson).
- Export PDF/PNG del dashboard con filtros aplicados.
- Tests automatizados (Vitest + pytest).
- Despliegue (Vercel para front + Render/Fly.io para back + PostgreSQL gestionado).
- Quitar password hardcoded → variable de entorno.

---

## 10. Decisiones de diseño que hay que poder defender

Si el docente pregunta:

> **"¿Por qué el grano es ítem y no pedido?"**
> Para poder analizar por categoría y vendedor. Un pedido tiene productos heterogéneos.

> **"¿Por qué reseñas en una dim aparte?"**
> Para evitar sesgo en promedios cuando un pedido tiene varios ítems. Y porque review_score es a grano pedido naturalmente.

> **"¿Por qué starflake en vez de estrella pura?"**
> Cliente y vendedor comparten geografía → duplicar lat/lon/región sería redundancia sin valor. El analítico hot-path (rutas origen→destino) usa role-playing, no el join extra.

> **"¿Por qué DIM_TIEMPO con id YYYYMMDD y no IDENTITY?"**
> Permite filtrar rangos de fechas sin join (`WHERE id_tiempo BETWEEN 20170101 AND 20171231`).

> **"¿Por qué SQL Server en lugar de PostgreSQL?"**
> Lo pidió el docente. Azure SQL Edge en Docker para correr en macOS ARM.

> **"¿Por qué FastAPI en lugar de SSIS?"**
> SSIS ya se usaría en el ETL si fuera obligatorio; el docente lo da como opción. FastAPI es más reutilizable, versionable en git y sirve también como API para el dashboard React. SSIS sería válido para Etapa 1 (ETL) pero no reemplaza el backend del dashboard.
