# Handoff — Implementación de Capa Data Mart sobre OlistDW

> **Propósito de este documento:** Brief completo para que una IA u otro desarrollador continúe el trabajo. Tiene todo el contexto necesario: proyecto, estado actual, arquitectura objetivo, especificación detallada de cada artefacto a producir, y plan paso a paso.
>
> **Idioma del proyecto:** Español (Perú). Todo el código, comentarios y documentación deben estar en español.
>
> **Fecha de generación:** 2026-05-22

---

## 0. TL;DR (3 párrafos)

El usuario, **Manuel Merino**, es estudiante de 9no ciclo de estadística en una universidad peruana. Está en el proyecto final del curso "Big Data Analysis" junto con 3 compañeros (Jaime Rios, Felix Huaman, Adrian Montes). El proyecto consiste en hacer una **consultoría analítica** sobre el dataset **Olist Brazilian E-Commerce** (Kaggle), aplicando los hallazgos a empresas peruanas de e-commerce. Tienen 5 problemas de negocio a resolver, 21 KPIs definidos, y deben entregar un dashboard ejecutivo + reporte ≤12 páginas + defensa oral de 20 minutos. El Avance 1 (KPIs + modelo de datos) ya se entregó el 23-abril-2026.

El stack es: **SQL Server (Azure SQL Edge en Docker, contenedor `sqlserver`, puerto 1433, BD `OlistDW`) + Python ETL (`olist_dashboard/etl/load.py`) + FastAPI backend + Vite/React frontend**. El modelo dimensional ya está cargado: FACT_VENTAS (112,554 filas, grano = ítem) + 7 dimensiones (DIM_TIEMPO, DIM_CLIENTE, DIM_PRODUCTO, DIM_VENDEDOR, DIM_PAGO, DIM_GEOGRAFIA, DIM_RESENA). Categorías y tipos de pago **ya están en español** (UPDATE aplicado el 2026-05-22).

**El docente observó que falta una capa de Data Mart entre la BD relacional y el dashboard.** Por eso vamos a implementar la arquitectura clásica Kimball de 2 capas dentro de la misma BD: schema `dbo` (DW dimensional, lo que ya existe) + schema `mart` (nuevas tablas pre-agregadas por problema de negocio, una por P1-P5). El dashboard pasará a consumir solo `mart.*`. Esto resuelve la observación del docente, mejora el rendimiento del dashboard, y le da al equipo material rico para defender en el reporte y presentación.

---

## 1. Contexto del Proyecto

### 1.1 Equipo y roles
- **Manuel Merino Huaman** (usuario que coordina con la IA)
- Jaime Arturo Rios Chiuca
- Felix Moises Huaman Llanos
- Adrian Guido Montes Quispe

### 1.2 Marco académico
- Curso: **Big Data Analysis**, 9no ciclo de Estadística
- Universidad peruana, modalidad presencial
- Idioma de trabajo: **Español**
- Hoy es **2026-05-22**. Avance 1 entregado el 2026-04-23. Avance 2 sin fecha confirmada pero estamos en construcción del dashboard.

### 1.3 Enfoque y filosofía del proyecto

**Principio rector** (no negociable): el valor está en la **decisión que el modelo habilita**, no en el modelo en sí. Cada análisis debe terminar con una **afirmación accionable y cuantificada**, no descriptiva.

Ejemplo correcto:
> "Electrónica genera el 31% del ingreso total pero tiene el 48% de los reclamos — necesita un plan de acción urgente."

Ejemplo incorrecto:
> "Se observan diferencias en las medias de los grupos."

### 1.4 Rúbrica de evaluación (orden de prioridad)

| Dimensión | Peso |
|-----------|-----:|
| Pensamiento de negocio | **30%** |
| Calidad del análisis | 25% |
| Dashboard ejecutivo | 20% |
| Reporte y comunicación | 15% |
| **Calidad técnica del ETL** | **10%** |

Sofisticación técnica < pensamiento de negocio. Un proyecto con herramientas simples pero recomendaciones claras **supera** a uno técnicamente complejo pero sin conclusiones accionables.

### 1.5 Los 5 problemas de negocio

| # | Problema | Pregunta central |
|---|----------|------------------|
| P1 | Rentabilidad por categoría | ¿Qué genera dinero y qué lo quita? ¿Es cierto el 80/20? |
| P2 | Retención de clientes | ¿Por qué los clientes no vuelven? ¿Cómo segmentamos para actuar? |
| P3 | Control de tiempos de entrega | ¿En qué rutas se concentran los retrasos? |
| P4 | Desempeño de vendedores | Semáforo Elite/Estándar/Crítico |
| P5 | Causas de insatisfacción | Análisis de reseñas 1-2★, NPS |

### 1.6 21 KPIs definidos (no añadir más sin razón)

**P1:** ingreso total, ticket promedio, concentración top-5, flete sobre precio.
**P2:** tasa de recompra, clientes únicos, CLV, distribución RFM (5 segmentos).
**P3:** % entregas a tiempo, días promedio entrega, días retraso promedio, % retraso crítico (>7d).
**P4:** rating promedio, % pedidos con problemas, ingreso por vendedor, % vendedores críticos.
**P5:** % reseñas positivas (4-5), % reseñas negativas (1-2), NPS, evolución mensual.

---

## 2. Stack Técnico

### 2.1 Componentes

```
9 CSVs Olist (Kaggle)
    │
    ▼ Python ETL (load.py)
SQL Server (Azure SQL Edge en Docker, contenedor "sqlserver", localhost:1433)
    │
    ▼ FastAPI (Python, backend)
    │
    ▼ Vite + React (frontend, 5 vistas)
```

### 2.2 Credenciales y ubicaciones

```
DB_HOST     = localhost
DB_PORT     = 1433
DB_USER     = sa
DB_PASSWORD = TuClaveFuerte123!
DB_NAME     = OlistDW

CSVs Olist     = ~/Documents/proyectos/olist_bda/data/raw/
Datos también  = .../ProyectoFinal/proyectobigdata/data/  (alternativa, mismo contenido)

Proyecto root  = /Users/manuelmerino/Documents/Documentos - MacBook Air de Manuel/Agentes Claude Code/BigDataAnalysis/ProyectoFinal

venv Python    = .../ProyectoFinal/olist_dashboard/.venv/bin/python
               (tiene: pymssql, pandas, sqlalchemy, pyarrow, fastapi, uvicorn)
```

### 2.3 Estructura de carpetas relevantes

```
ProyectoFinal/
├── olist_dashboard/        ← stack actual (en uso)
│   ├── etl/                  load.py, config.py
│   ├── db/                   schema.sql
│   ├── backend/              FastAPI: main.py, db.py, filters.py, routes/
│   ├── frontend/             Vite/React: src/views, src/lib/translate.ts
│   └── .venv/                Python con todas las deps
├── proyectobigdata/        ← Streamlit obsoleto, NO usar (solo data/ se reutiliza)
├── bidgata_avance/         ← LaTeX del Avance 1
│   └── avance1_bd/
│       ├── main.tex
│       └── figuras/
│           ├── modelo_fisico_mejorado.pdf  (versión obsoleta)
│           └── modelo_fisico_v3.pdf        (versión actual, con DIM_RESENA)
└── HANDOFF_DATAMART.md     ← este documento

../scripts/                 ← scripts ETL OBSOLETOS (01-07b). NO usar.
                              Solo `09_traducir_dim_es.py` está vigente.
```

---

## 3. Estado Real de la Base de Datos (verificado 2026-05-22)

### 3.1 Tablas y conteos

| Tabla | Filas | Notas |
|-------|------:|-------|
| `DIM_TIEMPO` | 634 | Solo fechas presentes en orders. `id_tiempo` = formato YYYYMMDD. `dia_semana` en español. |
| `DIM_GEOGRAFIA` | 15,249 | `ciudad` en minúscula con tildes (ej: "sao paulo"). Coords promediadas por zip. |
| `DIM_CLIENTE` | 99,441 | FK a DIM_GEOGRAFIA. |
| `DIM_VENDEDOR` | 3,095 | FK a DIM_GEOGRAFIA. |
| `DIM_PRODUCTO` | 32,951 | Columna `categoria` (sin `_es`), valores **en español**: "Salud y belleza", "Cama, baño y mesa", etc. |
| `DIM_PAGO` | 28 | `tipo_pago` **en español**: "Tarjeta de crédito", "Boleto bancario", etc. |
| `DIM_RESENA` | 98,116 | Grano = pedido. UNIQUE en `id_pedido`. Tiene texto del comentario en NVARCHAR(MAX). |
| `FACT_VENTAS` | 112,554 | Grano = ítem. Tiene `id_pedido` (degenerate dim), `estado_pedido` (VARCHAR(20)). NO tiene puntuacion_review/satisfaccion (esos están en DIM_RESENA). |

### 3.2 DDL exacto de FACT_VENTAS

```sql
CREATE TABLE FACT_VENTAS (
    id_item_venta       INT           IDENTITY(1,1) PRIMARY KEY,
    id_pedido           VARCHAR(50)   NOT NULL,        -- degenerate dim
    estado_pedido       VARCHAR(20)   NOT NULL,        -- delivered, shipped, canceled, etc.
    id_cliente          VARCHAR(50)   NOT NULL,
    id_producto         VARCHAR(50)   NOT NULL,
    id_vendedor         VARCHAR(50)   NOT NULL,
    id_tiempo           INT           NOT NULL,
    id_pago             INT           NOT NULL,
    id_geografia_cli    INT           NOT NULL,
    id_geografia_ven    INT           NOT NULL,
    precio              DECIMAL(10,2) NOT NULL,
    flete               DECIMAL(10,2) NOT NULL,
    valor_total         DECIMAL(10,2) NOT NULL,
    flete_sobre_precio  DECIMAL(8,2),                  -- ⚠️ schema.sql dice (7,2) pero BD es (8,2)
    dias_hasta_entrega  INT,
    dias_retraso        INT,
    entrego_a_tiempo    BIT,
    -- 7 FKs a las DIMs (ver schema.sql)
);
```

### 3.3 DDL exacto de DIM_RESENA

```sql
CREATE TABLE DIM_RESENA (
    id_resena            VARCHAR(50)   NOT NULL PRIMARY KEY,
    id_pedido            VARCHAR(50)   NOT NULL,
    puntuacion_review    TINYINT       NOT NULL,        -- 1..5
    satisfaccion         VARCHAR(10)   NOT NULL,        -- Buena / Regular / Mala
    escribio_comentario  BIT           NOT NULL,
    comentario_titulo    NVARCHAR(200),
    comentario_texto     NVARCHAR(MAX),
    fecha_creacion       DATE,
    fecha_respuesta      DATE,
    CONSTRAINT uq_resena_pedido UNIQUE (id_pedido)
);
```

DIM_RESENA se une a FACT_VENTAS vía `id_pedido` (NO es FK formal porque los granos difieren: FACT = ítem, RESENA = pedido).

### 3.4 Distribución de `estado_pedido` en FACT_VENTAS

```
delivered     110,101  (97.8%)
shipped         1,185
canceled          542
invoiced          359
processing        357
unavailable         7
approved            3
```

### 3.5 Esquema "starflake"

El modelo tiene un componente snowflake: `DIM_CLIENTE.id_geografia → DIM_GEOGRAFIA` y `DIM_VENDEDOR.id_geografia → DIM_GEOGRAFIA`. **No es estrella pura.** Se defiende como "estrella con role-playing + dimensión normalizada compartida" justificando que evita el doble JOIN en P3 (rutas origen-destino, donde FACT tiene `id_geografia_cli` e `id_geografia_ven` directamente).

### 3.6 Cobertura de reseñas

- 97,313 pedidos en FACT_VENTAS tienen reseña en DIM_RESENA
- 1,274 pedidos sin reseña (esperado para Olist, ~1.3%)
- Total reseñas en DIM_RESENA: 98,116 (algunas no matchean con FACT porque vienen de pedidos cancelados sin items)

---

## 4. El Contexto del Cambio (feedback del docente)

El docente le dijo verbalmente a Manuel:

> "Tú estás creando un copo de nieve en SQL a partir de datos en CSV que fue llenado con Python. ¿Y tu data mart? Entiendo que eso es lo que usa tu dashboard."

### Interpretación

1. **"Copo de nieve"**: el docente nota el componente snowflake (DIM_CLIENTE → DIM_GEOGRAFIA). Esto se asume como decisión defendible documentada (ver §3.5), no se va a cambiar.

2. **"¿Y tu data mart?"**: el docente pide ver una **capa de data marts derivada** del modelo dimensional, que sea la fuente de verdad del dashboard. **Esto es lo que vamos a implementar.**

3. **Importante**: el enunciado escrito del proyecto (`Proyecto_1_BD.docx`) **NO menciona** las palabras "data mart", "data warehouse", "Kimball", "staging" ni "OLAP". El requisito del docente es verbal. Aún así lo implementamos porque (a) responde su observación, (b) mejora el dashboard, (c) da material rico para el reporte.

### Diagnóstico de RFM relevante para P2

Datos verificados:
```
Total clientes únicos (con pedidos delivered):  93,285
One-time buyers (1 pedido):                      90,488  (97.0%)
Recurrentes (2+ pedidos):                         2,797  (3.0%)
```

**Consecuencia técnica**: el método clásico de RFM con `NTILE(5) OVER (ORDER BY frecuencia)` **es matemáticamente inválido** para este dataset porque 97% de los valores son idénticos (=1). No se pueden formar quintiles distintos.

**Solución adoptada para P2** (ver detalle en §6.2): usar **reglas categóricas** para F en lugar de NTILE.

---

## 5. Arquitectura Objetivo

```
9 CSVs (raw)
   │
   ▼ Python ETL (load.py) — SIN CAMBIOS
┌─────────────────────────────────────────────────┐
│  BD: OlistDW                                    │
│                                                 │
│  ┌── schema: dbo ──────────────────────────┐   │
│  │  FACT_VENTAS + 7 DIM + DIM_RESENA       │   │
│  │  (intacto, sin cambios)                 │   │
│  └─────────────────────────────────────────┘   │
│                  │                              │
│                  ▼ refresh_marts.sql (NUEVO)   │
│  ┌── schema: mart (NUEVO) ──────────────────┐  │
│  │  mart.p1_rentabilidad_categoria          │  │
│  │  mart.p2_rfm_clientes                    │  │
│  │  mart.p3_rutas_problematicas             │  │
│  │  mart.p4_vendedores_scorecard            │  │
│  │  mart.p5_satisfaccion_resumen            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
   │
   ▼ Backend FastAPI (consulta `mart.*`, no `dbo.FACT_VENTAS`)
   │
   ▼ Frontend React
```

### Principios de diseño de los data marts

1. **Una tabla por problema de negocio (P1-P5).**
2. **Grano agregado** acorde al problema (categoría, cliente, ruta, vendedor, etc.).
3. **Filtros estándar pre-aplicados** según corresponda al problema (ver §6).
4. **Métricas pre-calculadas** (no se calcula nada en query del dashboard).
5. **Diseño desnormalizado** — no hay JOINs entre data marts.
6. **Auditabilidad**: el docente puede hacer `SELECT * FROM mart.pX_*` y ver exactamente lo que muestra el dashboard.

### Política de filtros por `estado_pedido` (decisión académica)

| Problema | Filtro estado_pedido | Razón |
|----------|---------------------|-------|
| P1 Rentabilidad | `IN ('delivered','shipped')` | Ingreso real o garantizado |
| P2 Retención | `= 'delivered'` | Solo clientes que sí recibieron |
| P3 Entregas | `= 'delivered'` | Único universo con `dias_retraso` válido |
| P4 Vendedores | sin filtro (todos los estados) | Las cancelaciones son señal de mal vendedor |
| P5 Satisfacción | `INNER JOIN DIM_RESENA` define el universo | Solo pedidos con reseña |

---

## 6. Especificación Detallada de cada Data Mart

### 6.1 `mart.p1_rentabilidad_categoria`

**Pregunta de negocio:** ¿Qué categorías concentran el ingreso? ¿Cuáles son categorías "trampa" (alto flete sobre precio)?

**Grano:** una fila por categoría de producto.

**Estimación de filas:** ~73 (número de categorías distintas en DIM_PRODUCTO).

**DDL:**
```sql
CREATE TABLE mart.p1_rentabilidad_categoria (
    ranking             INT             NOT NULL,
    categoria           NVARCHAR(60)    NOT NULL,
    items_vendidos      INT             NOT NULL,
    pedidos_distintos   INT             NOT NULL,
    ingreso_brl         DECIMAL(14,2)   NOT NULL,
    ticket_promedio     DECIMAL(10,2)   NOT NULL,
    pct_individual      DECIMAL(5,2)    NOT NULL,
    pct_acumulado       DECIMAL(5,2)    NOT NULL,
    flete_sobre_precio  DECIMAL(5,2),
    rating_promedio     DECIMAL(3,2),
    pct_resena_mala     DECIMAL(5,2),
    pct_retraso         DECIMAL(5,2),
    es_categoria_trampa BIT             NOT NULL,   -- 1 si flete_pct > 35
    es_categoria_estrella BIT           NOT NULL,   -- 1 si pct_individual > 3 AND rating > 4.2 AND pct_a_tiempo > 90
    CONSTRAINT pk_p1 PRIMARY KEY (categoria)
);
```

**Lógica de carga (SQL conceptual):**
```sql
INSERT INTO mart.p1_rentabilidad_categoria
WITH base AS (
    SELECT
        p.categoria,
        COUNT(*) AS items_vendidos,
        COUNT(DISTINCT f.id_pedido) AS pedidos_distintos,
        SUM(f.valor_total) AS ingreso_brl,
        AVG(f.valor_total) AS ticket_promedio,
        AVG(f.flete_sobre_precio) AS flete_pct,
        AVG(CAST(f.entrego_a_tiempo AS FLOAT)) * 100 AS pct_a_tiempo
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_PRODUCTO p ON f.id_producto = p.id_producto
    WHERE p.categoria IS NOT NULL
      AND f.estado_pedido IN ('delivered','shipped')
    GROUP BY p.categoria
),
con_resenas AS (
    SELECT
        p.categoria,
        AVG(CAST(r.puntuacion_review AS FLOAT)) AS rating_promedio,
        SUM(CASE WHEN r.puntuacion_review <= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS pct_resena_mala
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_PRODUCTO p ON f.id_producto = p.id_producto
    JOIN dbo.DIM_RESENA r ON f.id_pedido = r.id_pedido
    WHERE p.categoria IS NOT NULL
      AND f.estado_pedido IN ('delivered','shipped')
    GROUP BY p.categoria
),
total_global AS (SELECT SUM(ingreso_brl) AS gran_total FROM base)
SELECT
    ROW_NUMBER() OVER (ORDER BY b.ingreso_brl DESC) AS ranking,
    b.categoria,
    b.items_vendidos,
    b.pedidos_distintos,
    CAST(b.ingreso_brl AS DECIMAL(14,2)),
    CAST(b.ticket_promedio AS DECIMAL(10,2)),
    CAST(b.ingreso_brl / tg.gran_total * 100 AS DECIMAL(5,2)) AS pct_individual,
    CAST(SUM(b.ingreso_brl) OVER (ORDER BY b.ingreso_brl DESC) / tg.gran_total * 100 AS DECIMAL(5,2)) AS pct_acumulado,
    CAST(b.flete_pct AS DECIMAL(5,2)),
    CAST(cr.rating_promedio AS DECIMAL(3,2)),
    CAST(ISNULL(cr.pct_resena_mala, 0) AS DECIMAL(5,2)),
    CAST((100 - b.pct_a_tiempo) AS DECIMAL(5,2)) AS pct_retraso,
    CASE WHEN b.flete_pct > 35 THEN 1 ELSE 0 END AS es_categoria_trampa,
    CASE WHEN (b.ingreso_brl / tg.gran_total * 100) > 3
              AND cr.rating_promedio > 4.2
              AND b.pct_a_tiempo > 90
         THEN 1 ELSE 0 END AS es_categoria_estrella
FROM base b
LEFT JOIN con_resenas cr ON b.categoria = cr.categoria
CROSS JOIN total_global tg
ORDER BY b.ingreso_brl DESC;
```

**Hallazgo conocido:** Salud y belleza es #1 (1.44M BRL, 9.23%). Artículos del hogar tiene 40% flete sobre precio (categoría trampa).

---

### 6.2 `mart.p2_rfm_clientes`

**Pregunta de negocio:** ¿Cómo segmentamos a los 93,285 clientes únicos para diseñar acciones diferenciadas?

**Grano:** una fila por `customer_unique_id`.

**Estimación de filas:** ~93,285.

**Decisión técnica importante:** debido a que **97% de clientes son one-time buyers**, NO se puede usar NTILE(5) sobre frecuencia. Se usan **reglas categóricas para F** y NTILE(5) para R y M.

**DDL:**
```sql
CREATE TABLE mart.p2_rfm_clientes (
    customer_unique_id  VARCHAR(50)   NOT NULL PRIMARY KEY,
    num_pedidos         INT           NOT NULL,
    dias_recencia       INT           NOT NULL,        -- días desde última compra hasta 2018-09-01
    monto_total         DECIMAL(12,2) NOT NULL,
    R                   TINYINT       NOT NULL,        -- 1..5 (5 = más reciente)
    F                   TINYINT       NOT NULL,        -- 1..5 (asignada por reglas, ver lógica)
    M                   TINYINT       NOT NULL,        -- 1..5 (5 = más gastó)
    segmento            NVARCHAR(30)  NOT NULL,        -- Champions, VIP recientes, En riesgo, etc.
    ingreso_brl         DECIMAL(12,2) NOT NULL,        -- igual a monto_total, para conveniencia
    fecha_ultima_compra DATE          NOT NULL
);
```

**Lógica de F (reglas categóricas, NO NTILE):**
```
F = 5 si num_pedidos >= 4
F = 4 si num_pedidos = 3
F = 3 si num_pedidos = 2
F = 2 si num_pedidos = 1 AND monto_total >= percentil_75(monto)
F = 1 si num_pedidos = 1 AND monto_total <  percentil_75(monto)
```

**Lógica de segmento (combina R y F principalmente):**

| Segmento | Regla |
|----------|-------|
| Champions | F >= 3 (recurrentes) |
| VIP recientes | F = 2 AND R >= 4 |
| En riesgo de fuga | F = 2 AND R <= 2 |
| Dormidos | F = 1 AND R <= 2 |
| Recientes potenciales | F = 1 AND R >= 4 |
| Estables | resto |

**Lógica de carga (SQL conceptual):**
```sql
INSERT INTO mart.p2_rfm_clientes
WITH base AS (
    SELECT
        c.customer_unique_id,
        COUNT(DISTINCT f.id_pedido) AS num_pedidos,
        DATEDIFF(DAY, MAX(t.fecha), '2018-09-01') + 1 AS dias_recencia,
        SUM(f.valor_total) AS monto_total,
        MAX(t.fecha) AS fecha_ultima_compra
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_CLIENTE c ON f.id_cliente = c.id_cliente
    JOIN dbo.DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
    WHERE f.estado_pedido = 'delivered'
    GROUP BY c.customer_unique_id
),
p75 AS (SELECT DISTINCT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY monto_total) OVER () AS p75_monto FROM base),
con_scores AS (
    SELECT
        b.*,
        NTILE(5) OVER (ORDER BY b.dias_recencia DESC) AS R,
        CASE
            WHEN b.num_pedidos >= 4 THEN 5
            WHEN b.num_pedidos = 3  THEN 4
            WHEN b.num_pedidos = 2  THEN 3
            WHEN b.num_pedidos = 1 AND b.monto_total >= p.p75_monto THEN 2
            ELSE 1
        END AS F,
        NTILE(5) OVER (ORDER BY b.monto_total ASC) AS M
    FROM base b CROSS JOIN p75 p
)
SELECT
    customer_unique_id, num_pedidos, dias_recencia, monto_total,
    R, F, M,
    CASE
        WHEN F >= 3                  THEN N'Champions'
        WHEN F = 2 AND R >= 4        THEN N'VIP recientes'
        WHEN F = 2 AND R <= 2        THEN N'En riesgo de fuga'
        WHEN F = 1 AND R <= 2        THEN N'Dormidos'
        WHEN F = 1 AND R >= 4        THEN N'Recientes potenciales'
        ELSE                              N'Estables'
    END AS segmento,
    monto_total AS ingreso_brl,
    fecha_ultima_compra
FROM con_scores;
```

**Hallazgo conocido a usar en el reporte:** "El 97% de clientes compraron una sola vez. La oportunidad ejecutiva NO es retener al 3% recurrente — es convertir al 97% one-time en repetidores."

---

### 6.3 `mart.p3_rutas_problematicas`

**Pregunta de negocio:** ¿En qué rutas estado→estado se concentran los retrasos?

**Grano:** una fila por par (estado_origen, estado_destino).

**Estimación de filas:** ~27 estados × 27 estados = máximo 729 combinaciones, en práctica ~400-500 con tráfico real.

**DDL:**
```sql
CREATE TABLE mart.p3_rutas_problematicas (
    estado_origen        VARCHAR(4)    NOT NULL,
    estado_destino       VARCHAR(4)    NOT NULL,
    region_origen        VARCHAR(20)   NOT NULL,
    region_destino       VARCHAR(20)   NOT NULL,
    es_intra_estado      BIT           NOT NULL,
    total_envios         INT           NOT NULL,
    dias_promedio_entrega DECIMAL(5,1) NOT NULL,
    dias_retraso_promedio DECIMAL(5,1),
    pct_a_tiempo         DECIMAL(5,2)  NOT NULL,
    pct_retraso_critico  DECIMAL(5,2)  NOT NULL,        -- >7 días
    ingreso_brl          DECIMAL(14,2) NOT NULL,
    ranking_problemas    INT           NOT NULL,
    CONSTRAINT pk_p3 PRIMARY KEY (estado_origen, estado_destino)
);
```

**Filtro:** `WHERE estado_pedido = 'delivered'` (único universo con `dias_retraso` válido).

**Lógica de carga:** JOIN entre FACT_VENTAS y DIM_GEOGRAFIA dos veces (rol cliente y rol vendedor), agregar por estado_destino (vendedor → cliente). Calcular ranking_problemas por (% retraso_critico DESC, total_envios DESC).

---

### 6.4 `mart.p4_vendedores_scorecard`

**Pregunta de negocio:** ¿Qué vendedores son Elite, Estándar, En observación o Críticos?

**Grano:** una fila por vendedor.

**Estimación de filas:** ~3,095 (todos los vendedores de DIM_VENDEDOR).

**DDL:**
```sql
CREATE TABLE mart.p4_vendedores_scorecard (
    id_vendedor          VARCHAR(50)   NOT NULL PRIMARY KEY,
    estado_vendedor      VARCHAR(4),
    region_vendedor      VARCHAR(20),
    num_pedidos          INT           NOT NULL,
    num_items            INT           NOT NULL,
    ingreso_brl          DECIMAL(14,2) NOT NULL,
    rating_promedio      DECIMAL(3,2),
    pct_a_tiempo         DECIMAL(5,2)  NOT NULL,
    pct_cancelados       DECIMAL(5,2)  NOT NULL,
    pct_resena_mala      DECIMAL(5,2),
    semaforo             NVARCHAR(15)  NOT NULL,        -- 'Elite' / 'Estándar' / 'En observación' / 'Crítico'
    ranking_ingreso      INT           NOT NULL
);
```

**Sin filtro de estado_pedido** (las cancelaciones cuentan como señal de mala calidad del vendedor).

**Reglas del semáforo:**
```
Elite          : rating >= 4.5 AND pct_a_tiempo >= 95 AND pct_cancelados < 2
Crítico        : rating < 3.5 OR pct_a_tiempo < 80
En observación : pct_cancelados >= 5 OR pct_resena_mala >= 25
Estándar       : el resto
```

**Hallazgo esperado:** identificar el % de ingreso total en manos de vendedores Críticos y En observación.

---

### 6.5 `mart.p5_satisfaccion_resumen`

**Pregunta de negocio:** ¿Cuál es el NPS? ¿Cuáles son las causas raíz de insatisfacción?

**Este data mart tiene 3 tablas hijas** porque P5 tiene múltiples granos:

#### 6.5.1 `mart.p5_distribucion_puntuacion` — distribución global de scores

```sql
CREATE TABLE mart.p5_distribucion_puntuacion (
    puntuacion          TINYINT       NOT NULL PRIMARY KEY,
    num_resenas         INT           NOT NULL,
    pct                 DECIMAL(5,2)  NOT NULL,
    pct_con_comentario  DECIMAL(5,2)  NOT NULL
);
```

5 filas (puntuación 1, 2, 3, 4, 5).

#### 6.5.2 `mart.p5_satisfaccion_por_mes` — evolución temporal

```sql
CREATE TABLE mart.p5_satisfaccion_por_mes (
    anio                SMALLINT      NOT NULL,
    mes                 TINYINT       NOT NULL,
    num_resenas         INT           NOT NULL,
    rating_promedio     DECIMAL(3,2)  NOT NULL,
    pct_positivas       DECIMAL(5,2)  NOT NULL,        -- 4-5★
    pct_negativas       DECIMAL(5,2)  NOT NULL,        -- 1-2★
    nps_estimado        DECIMAL(5,2)  NOT NULL,        -- (pct_positivas - pct_negativas)
    CONSTRAINT pk_p5m PRIMARY KEY (anio, mes)
);
```

#### 6.5.3 `mart.p5_palabras_frecuentes` — top palabras en reseñas negativas

```sql
CREATE TABLE mart.p5_palabras_frecuentes (
    palabra             NVARCHAR(60)  NOT NULL,
    score_grupo         VARCHAR(10)   NOT NULL,        -- 'negativa' (1-2) o 'positiva' (4-5)
    frecuencia          INT           NOT NULL,
    CONSTRAINT pk_p5p PRIMARY KEY (palabra, score_grupo)
);
```

Esta última requiere procesamiento de texto en Python (tokenización, stopwords PT/ES). Es la única que NO se puede llenar con SQL puro — necesita Python (NLTK o sklearn).

---

## 7. Plan de Implementación Paso a Paso

### Paso 0 — Preparación (5 min)

1. Validar que Docker está corriendo: `docker ps | grep sqlserver`
2. Validar conexión SQL con Python:
   ```bash
   /Users/manuelmerino/.../olist_dashboard/.venv/bin/python -c "
   import pymssql
   conn = pymssql.connect(server='localhost', port=1433, user='sa',
                          password='TuClaveFuerte123!', database='OlistDW')
   conn.cursor().execute('SELECT COUNT(*) FROM FACT_VENTAS')
   print('OK')
   "
   ```

### Paso 1 — Crear schema y DDL (15 min)

Crear archivo: `olist_dashboard/db/mart_schema.sql`

Contenido:
```sql
USE OlistDW;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'mart')
    EXEC('CREATE SCHEMA mart');
GO

-- Drop tables if exist (idempotente)
IF OBJECT_ID('mart.p1_rentabilidad_categoria','U') IS NOT NULL DROP TABLE mart.p1_rentabilidad_categoria;
IF OBJECT_ID('mart.p2_rfm_clientes','U') IS NOT NULL DROP TABLE mart.p2_rfm_clientes;
IF OBJECT_ID('mart.p3_rutas_problematicas','U') IS NOT NULL DROP TABLE mart.p3_rutas_problematicas;
IF OBJECT_ID('mart.p4_vendedores_scorecard','U') IS NOT NULL DROP TABLE mart.p4_vendedores_scorecard;
IF OBJECT_ID('mart.p5_distribucion_puntuacion','U') IS NOT NULL DROP TABLE mart.p5_distribucion_puntuacion;
IF OBJECT_ID('mart.p5_satisfaccion_por_mes','U') IS NOT NULL DROP TABLE mart.p5_satisfaccion_por_mes;
IF OBJECT_ID('mart.p5_palabras_frecuentes','U') IS NOT NULL DROP TABLE mart.p5_palabras_frecuentes;
GO

-- (todas las DDL de §6 aquí)
```

Ejecutar:
```bash
sqlcmd -S localhost,1433 -U sa -P 'TuClaveFuerte123!' -i mart_schema.sql
```
o desde Python con pymssql.

### Paso 2 — Crear 5 scripts SQL de refresh (1 hora)

Crear carpeta: `olist_dashboard/sql/`

Archivos:
- `refresh_p1_rentabilidad.sql`
- `refresh_p2_rfm.sql`
- `refresh_p3_logistica.sql`
- `refresh_p4_vendedores.sql`
- `refresh_p5_satisfaccion.sql` (solo las 2 primeras tablas; la de palabras va en Python)

Cada script tiene la forma:
```sql
USE OlistDW;
GO
TRUNCATE TABLE mart.pX_NOMBRE;
GO
INSERT INTO mart.pX_NOMBRE
    ...query del §6...
GO
SELECT COUNT(*) AS filas_cargadas FROM mart.pX_NOMBRE;  -- validación
```

### Paso 3 — Script Python orquestador (15 min)

Crear: `olist_dashboard/etl/refresh_marts.py`

```python
"""
Orquesta el refresh de todos los data marts.
Ejecuta los 5 scripts SQL en orden + el cálculo de palabras frecuentes en Python.

Uso:
    python etl/refresh_marts.py
"""
import sys
import time
from pathlib import Path
import pymssql
from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

def log(msg): print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def ejecutar_sql(filename):
    log(f"Ejecutando {filename}...")
    sql = (SQL_DIR / filename).read_text(encoding='utf-8')
    batches = [b.strip() for b in sql.split("\nGO\n") if b.strip()]
    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database=DB_NAME, autocommit=True)
    cur = conn.cursor()
    for batch in batches:
        cur.execute(batch)
    conn.close()
    log(f"  OK")

def calcular_palabras_frecuentes():
    """Calcula mart.p5_palabras_frecuentes desde texto de DIM_RESENA."""
    # Tokenizar comentario_texto con stopwords PT
    # INSERT INTO mart.p5_palabras_frecuentes
    ...

def main():
    t0 = time.time()
    for sql_file in [
        "refresh_p1_rentabilidad.sql",
        "refresh_p2_rfm.sql",
        "refresh_p3_logistica.sql",
        "refresh_p4_vendedores.sql",
        "refresh_p5_satisfaccion.sql",
    ]:
        ejecutar_sql(sql_file)
    calcular_palabras_frecuentes()
    log(f"OK total: {time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()
```

### Paso 4 — Adaptar backend FastAPI (30 min)

Modificar `olist_dashboard/backend/routes/p1_rentabilidad.py`, `p2_retencion.py`, ..., `p5_satisfaccion.py`.

Patrón antes:
```python
@router.get("/categorias")
def ranking_categorias(f: Filters = Depends(filter_dep)):
    return query("SELECT ... FROM dbo.FACT_VENTAS f JOIN ... GROUP BY ...")
```

Patrón después:
```python
@router.get("/categorias")
def ranking_categorias():  # los filtros aplicados ya están materializados
    return query("SELECT * FROM mart.p1_rentabilidad_categoria ORDER BY ranking")
```

**Importante:** algunos filtros dinámicos (rango de fechas, región) deben re-pensarse. Si el dashboard tiene un filtro "ver solo Q4 2017", ese filtro NO se puede aplicar sobre `mart.p1_*` porque ya está agregado por categoría sin dimensión temporal. **Solución:** o (a) agregar dimensión temporal a los data marts (crece la tabla), o (b) mover esos filtros a query dinámica sobre `dbo.*` cuando se aplican. **Decisión recomendada:** los filtros simples (categoría, región) sobre `mart.*`; los filtros de fecha vuelven a `dbo.*` con queries ad-hoc.

### Paso 5 — Validar (15 min)

Queries de smoke test:
```sql
SELECT TOP 10 * FROM mart.p1_rentabilidad_categoria ORDER BY ranking;
-- esperado: Salud y belleza primera, ~73 filas total

SELECT segmento, COUNT(*) FROM mart.p2_rfm_clientes GROUP BY segmento;
-- esperado: ~93k filas distribuidas en 6 segmentos

SELECT TOP 10 * FROM mart.p3_rutas_problematicas ORDER BY ranking_problemas;
-- esperado: ~400-500 rutas, las peores arriba

SELECT semaforo, COUNT(*) FROM mart.p4_vendedores_scorecard GROUP BY semaforo;
-- esperado: 4 categorías con conteos balanceados (Elite minoría, Estándar mayoría)

SELECT * FROM mart.p5_distribucion_puntuacion ORDER BY puntuacion;
-- esperado: 5 filas, ~57% en score 5
```

### Paso 6 — Documentar (10 min)

Actualizar `olist_dashboard/CONTEXT.md` y comentar en el reporte ejecutivo del Avance 2 la arquitectura 3-capa.

---

## 8. Convenciones y Decisiones Ya Tomadas

### 8.1 Idioma
- Todo en español: nombres de tablas (DIM_PRODUCTO no DimProduct), columnas (categoria, no category), comentarios en código (`# Carga el data mart...`).
- Mantener consistencia con lo ya existente.

### 8.2 Nomenclatura del schema mart
- Todas las tablas con prefijo `pN_` donde N es el número de problema.
- Snake_case.
- Plural para entidades agregadas: `vendedores_scorecard`, no `vendedor_scorecard`.

### 8.3 Tipos de datos
- DECIMAL para montos y porcentajes (nunca FLOAT en almacenamiento).
- VARCHAR para IDs externos (customer_id, order_id) — son strings hex de 32 chars.
- NVARCHAR para texto en español (DIM_PRODUCTO.categoria, segmento).
- TINYINT para scores 1-5 y BIT para flags.

### 8.4 Idempotencia
- Todos los scripts deben poder re-ejecutarse sin errores.
- DDL usa `IF OBJECT_ID(...) IS NOT NULL DROP TABLE`.
- Carga usa `TRUNCATE TABLE` antes de `INSERT`.

### 8.5 Fecha de corte para recencia (P2)
- `'2018-09-01'`: día siguiente al último pedido del dataset.
- Hardcoded. Documentar en el reporte.

### 8.6 Diccionarios de traducción
- Single source of truth: `olist_dashboard/frontend/src/lib/translate.ts`
- Réplica en Python: `olist_dashboard/etl/config.py` (CATEGORIAS_ES, TIPOS_PAGO_ES)
- Si se añade una categoría, **actualizar ambos**.

---

## 9. Riesgos y Consideraciones

### 9.1 El docente puede pedir más
Si en la defensa el docente pregunta por staging 3NF (capa 1), responder:
> "Adoptamos arquitectura Kimball: los CSVs en disco actúan como capa staging persistente, el schema `dbo` es el DW dimensional y `mart` son los data marts derivados. Es el patrón estándar en empresas modernas (dbt, Snowflake)."

### 9.2 Filtros dinámicos del dashboard
Los data marts están pre-agregados. Filtros de fecha o región que crucen agregaciones requieren queries ad-hoc sobre `dbo.*`. **No prometer interactividad total sin verificar.**

### 9.3 Refresh
Los data marts NO se actualizan solos. Cada vez que se cargan datos nuevos al ETL, hay que correr `refresh_marts.py`. Para el proyecto académico (datos estáticos) esto es manual: correr una vez después del load inicial.

### 9.4 Modelo de DIM_RESENA
Une con FACT vía `id_pedido` sin FK formal (granos distintos). Esto es **intencional** y defendible. No convertir a FK porque obligaría a cambiar el grano.

### 9.5 Una categoría sin traducir
Las categorías `pc_gamer` y `portateis_cozinha_e_preparadores_de_alimentos` fueron traducidas manualmente el 2026-05-22. Si re-cargas con `load.py`, las traducciones se aplican automáticamente vía `CATEGORIAS_ES`.

---

## 10. Próximos Pasos Después del Data Mart

1. **Integrar al backend FastAPI** (Paso 4 arriba).
2. **Conectar frontend React** a las nuevas rutas (probablemente cero cambios si el endpoint mantiene el mismo shape).
3. **Generar narrativa para el reporte ejecutivo**:
   - P1: "Salud y belleza lidera (9.2%). Artículos del hogar es trampa por flete (40%)."
   - P2: "97% one-time buyers. Acción: convertir, no retener."
   - P3: pendiente análisis tras crear el mart.
   - P4: pendiente.
   - P5: pendiente.
4. **Regenerar modelo físico TikZ con la capa mart** (opcional; el actual `modelo_fisico_v3.pdf` solo muestra `dbo`).
5. **Avance 2** (sin fecha confirmada): entregar el dashboard funcional con los 5 data marts + actualización del LaTeX `main.tex`.

---

## 11. Archivos Clave (referencia rápida)

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `olist_dashboard/db/schema.sql` | DDL del schema `dbo` | ✅ Existe, sincronizado con BD (excepto `flete_sobre_precio` DECIMAL(7,2) vs (8,2)) |
| `olist_dashboard/db/mart_schema.sql` | DDL del schema `mart` | ⏳ POR CREAR |
| `olist_dashboard/etl/load.py` | ETL Python que carga `dbo.*` | ✅ Existe, idempotente con traducciones ES |
| `olist_dashboard/etl/config.py` | Config + diccionarios ES | ✅ Existe |
| `olist_dashboard/etl/refresh_marts.py` | Orquestador del refresh de marts | ⏳ POR CREAR |
| `olist_dashboard/sql/refresh_p1_*.sql` ... `p5_*.sql` | Scripts de carga de cada mart | ⏳ POR CREAR (5 archivos) |
| `olist_dashboard/backend/routes/p1_*.py` ... `p5_*.py` | FastAPI routes | ✅ Existen, ⏳ por modificar para usar `mart.*` |
| `olist_dashboard/frontend/src/lib/translate.ts` | Traducciones EN→ES (single source of truth) | ✅ Existe, sincronizado |
| `bidgata_avance/avance1_bd/figuras/modelo_fisico_v3.pdf` | Diagrama TikZ actual | ✅ Generado 2026-05-22 |
| `bidgata_avance/avance1_bd/main.tex` | LaTeX del Avance 1 | ⚠️ Desactualizado respecto a BD real, se actualizará en Avance 2 |
| `~/.../BigDataAnalysis/scripts/09_traducir_dim_es.py` | Script idempotente de traducción | ✅ Existe, ya ejecutado |
| `~/.../BigDataAnalysis/scripts/01-07b.py` | Scripts ETL OBSOLETOS | ❌ NO USAR — desincronizados con BD real |

---

## 12. Verificaciones Antes de Empezar (checklist para la IA receptora)

- [ ] ¿Docker está corriendo? `docker ps | grep sqlserver`
- [ ] ¿Puedo conectar a SQL Server con las credenciales? (ver §2.2)
- [ ] ¿FACT_VENTAS tiene 112,554 filas? (si no, el ETL no se ha corrido o se modificó)
- [ ] ¿DIM_RESENA tiene 98,116 filas?
- [ ] ¿`DIM_PRODUCTO.categoria` tiene valores en español? (`SELECT TOP 5 categoria FROM DIM_PRODUCTO`)
- [ ] ¿El venv `.venv` tiene `pymssql`, `pandas`, `sqlalchemy`? (`pip list`)

Si algo de esto falla, regenerar desde:
1. Recargar datos: `python olist_dashboard/etl/load.py`
2. Aplicar traducciones: `python scripts/09_traducir_dim_es.py`
3. Continuar con Paso 1 de §7.

---

**Fin del handoff. Cualquier IA con este documento debe poder ejecutar la implementación sin hacer más preguntas al usuario.**
