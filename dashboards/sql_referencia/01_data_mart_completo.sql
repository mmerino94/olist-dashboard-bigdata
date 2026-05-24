-- ============================================================================
-- DATA MART OLIST — Schema mart completo + lógica de carga
-- ============================================================================
-- Documento de referencia para presentación académica.
-- Contiene: DDL + lógica de carga de los 7 data marts en un solo archivo.
--
-- Arquitectura:
--    9 CSVs → Python ETL (load.py) → schema dbo (DW dimensional)
--                                           ↓
--                                     refresh_marts.py
--                                           ↓
--                                     schema mart (este archivo)
--                                           ↓
--                                     Dashboard ejecutivo
--
-- Filtro de estado_pedido (decisión metodológica por problema):
--    P1 Rentabilidad: delivered + shipped (ingreso real o garantizado)
--    P2 Retención:    delivered (solo clientes que sí recibieron)
--    P3 Logística:    delivered (único universo con dias_retraso válido)
--    P4 Vendedores:   sin filtro (cancelaciones son señal de calidad)
--    P5 Satisfacción: INNER JOIN DIM_RESENA define el universo
--
-- Sub-tabla p5_palabras_frecuentes se llena con Python (NLP), ver
-- olist_dashboard/etl/cargar_palabras_p5.py
-- ============================================================================

USE OlistDW;
GO

-- Schema mart idempotente.
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'mart')
    EXEC('CREATE SCHEMA mart');
GO


-- ============================================================================
-- MART 1: mart.p1_rentabilidad_categoria
-- ============================================================================
-- Grano:    una fila por categoría de producto.
-- Filas:    72 (categorías distintas en DIM_PRODUCTO).
-- Pregunta: ¿qué categorías generan dinero y cuáles son trampa?
-- ============================================================================

IF OBJECT_ID('mart.p1_rentabilidad_categoria','U') IS NOT NULL
    DROP TABLE mart.p1_rentabilidad_categoria;
GO

CREATE TABLE mart.p1_rentabilidad_categoria (
    ranking               INT             NOT NULL,  -- posición por ingreso (1 = top)
    categoria             NVARCHAR(60)    NOT NULL,  -- nombre en español (PK)
    items_vendidos        INT             NOT NULL,  -- cuántos ítems vendió
    pedidos_distintos     INT             NOT NULL,  -- pedidos únicos (no items)
    ingreso_brl           DECIMAL(14,2)   NOT NULL,  -- SUM(precio + flete)
    ticket_promedio       DECIMAL(10,2)   NOT NULL,  -- AVG por ítem
    pct_individual        DECIMAL(5,2)    NOT NULL,  -- % del ingreso total
    pct_acumulado         DECIMAL(5,2)    NOT NULL,  -- % acumulado (Pareto)
    flete_sobre_precio    DECIMAL(5,2),              -- AVG flete/precio×100
    rating_promedio       DECIMAL(3,2),              -- AVG de reseñas 1-5
    pct_resena_mala       DECIMAL(5,2),              -- % de reseñas ★1-★2
    pct_retraso           DECIMAL(5,2),              -- % pedidos tardíos
    es_categoria_trampa   BIT             NOT NULL,  -- 1 si flete% > 35
    es_categoria_estrella BIT             NOT NULL,  -- 1 si pct>3 + rating>4.2 + a_tiempo>90
    CONSTRAINT pk_p1 PRIMARY KEY (categoria)
);
GO

TRUNCATE TABLE mart.p1_rentabilidad_categoria;
GO

WITH
-- CTE 1: agregaciones operativas por categoría (delivered+shipped).
base AS (
    SELECT
        p.categoria,
        COUNT(*)                                  AS items_vendidos,
        COUNT(DISTINCT f.id_pedido)               AS pedidos_distintos,
        SUM(f.valor_total)                        AS ingreso_brl,
        AVG(f.valor_total)                        AS ticket_promedio,
        AVG(f.flete_sobre_precio)                 AS flete_pct,
        AVG(CAST(f.entrego_a_tiempo AS FLOAT)) * 100 AS pct_a_tiempo
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_PRODUCTO p ON f.id_producto = p.id_producto
    WHERE p.categoria IS NOT NULL
      AND f.estado_pedido IN ('delivered','shipped')
    GROUP BY p.categoria
),
-- CTE 2: rating y % reseña mala por categoría (solo pedidos con reseña).
con_resenas AS (
    SELECT
        p.categoria,
        AVG(CAST(r.puntuacion_review AS FLOAT))   AS rating_promedio,
        SUM(CASE WHEN r.puntuacion_review <= 2 THEN 1 ELSE 0 END) * 100.0
            / COUNT(*)                            AS pct_resena_mala
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_PRODUCTO p ON f.id_producto = p.id_producto
    JOIN dbo.DIM_RESENA   r ON f.id_pedido   = r.id_pedido
    WHERE p.categoria IS NOT NULL
      AND f.estado_pedido IN ('delivered','shipped')
    GROUP BY p.categoria
),
-- CTE 3: gran total para calcular % individual y acumulado.
total_global AS (
    SELECT SUM(ingreso_brl) AS gran_total FROM base
)
INSERT INTO mart.p1_rentabilidad_categoria (
    ranking, categoria, items_vendidos, pedidos_distintos, ingreso_brl,
    ticket_promedio, pct_individual, pct_acumulado, flete_sobre_precio,
    rating_promedio, pct_resena_mala, pct_retraso,
    es_categoria_trampa, es_categoria_estrella
)
SELECT
    ROW_NUMBER() OVER (ORDER BY b.ingreso_brl DESC)                  AS ranking,
    b.categoria,
    b.items_vendidos,
    b.pedidos_distintos,
    CAST(b.ingreso_brl       AS DECIMAL(14,2))                       AS ingreso_brl,
    CAST(b.ticket_promedio   AS DECIMAL(10,2))                       AS ticket_promedio,
    CAST(b.ingreso_brl / tg.gran_total * 100 AS DECIMAL(5,2))        AS pct_individual,
    CAST(SUM(b.ingreso_brl) OVER (ORDER BY b.ingreso_brl DESC)
         / tg.gran_total * 100 AS DECIMAL(5,2))                      AS pct_acumulado,
    CAST(b.flete_pct         AS DECIMAL(5,2))                        AS flete_sobre_precio,
    CAST(cr.rating_promedio  AS DECIMAL(3,2))                        AS rating_promedio,
    CAST(ISNULL(cr.pct_resena_mala, 0) AS DECIMAL(5,2))              AS pct_resena_mala,
    CAST((100 - b.pct_a_tiempo) AS DECIMAL(5,2))                     AS pct_retraso,
    CASE WHEN b.flete_pct > 35 THEN 1 ELSE 0 END                     AS es_categoria_trampa,
    CASE WHEN (b.ingreso_brl / tg.gran_total * 100) > 3
              AND cr.rating_promedio > 4.2
              AND b.pct_a_tiempo > 90
         THEN 1 ELSE 0 END                                           AS es_categoria_estrella
FROM base b
LEFT JOIN con_resenas cr ON b.categoria = cr.categoria
CROSS JOIN total_global tg;
GO


-- ============================================================================
-- MART 2: mart.p2_rfm_clientes
-- ============================================================================
-- Grano:    una fila por customer_unique_id.
-- Filas:    ~93,285 clientes únicos.
-- Pregunta: ¿cómo segmentamos clientes para diseñar acciones de retención?
-- Decisión clave: F por reglas categóricas (NO NTILE), porque el 97% de
-- clientes son one-time buyers y NTILE rompería.
-- Fecha de corte de recencia: '2018-09-01' (día siguiente al último pedido).
-- ============================================================================

IF OBJECT_ID('mart.p2_rfm_clientes','U') IS NOT NULL
    DROP TABLE mart.p2_rfm_clientes;
GO

CREATE TABLE mart.p2_rfm_clientes (
    customer_unique_id  VARCHAR(50)   NOT NULL PRIMARY KEY,
    num_pedidos         INT           NOT NULL,   -- COUNT(DISTINCT id_pedido)
    dias_recencia       INT           NOT NULL,   -- días desde última compra
    monto_total         DECIMAL(12,2) NOT NULL,   -- SUM(valor_total)
    R                   TINYINT       NOT NULL,   -- 1..5 (5 = más reciente)
    F                   TINYINT       NOT NULL,   -- 1..5 (REGLAS, no NTILE)
    M                   TINYINT       NOT NULL,   -- 1..5 (5 = más gastó)
    segmento            NVARCHAR(30)  NOT NULL,   -- Champions / VIP / Riesgo / Dormido / etc.
    ingreso_brl         DECIMAL(12,2) NOT NULL,   -- alias de monto_total
    fecha_ultima_compra DATE          NOT NULL
);
GO

TRUNCATE TABLE mart.p2_rfm_clientes;
GO

WITH
-- CTE 1: agregaciones RFM raw por cliente único.
base AS (
    SELECT
        c.customer_unique_id,
        COUNT(DISTINCT f.id_pedido)                              AS num_pedidos,
        DATEDIFF(DAY, MAX(t.fecha), '2018-09-01') + 1            AS dias_recencia,
        SUM(f.valor_total)                                       AS monto_total,
        MAX(t.fecha)                                             AS fecha_ultima_compra
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_CLIENTE c ON f.id_cliente = c.id_cliente
    JOIN dbo.DIM_TIEMPO  t ON f.id_tiempo  = t.id_tiempo
    WHERE f.estado_pedido = 'delivered'
    GROUP BY c.customer_unique_id
),
-- CTE 2: percentil 75 del monto (escalar único).
-- Workaround: PERCENTILE_CONT OVER() no admite DISTINCT en SQL Server.
-- Encapsulamos en subquery + MAX() para colapsar a un solo valor.
p75 AS (
    SELECT MAX(p75_monto) AS p75_monto
    FROM (
        SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY monto_total) OVER () AS p75_monto
        FROM base
    ) x
),
-- CTE 3: aplica R, F, M.
--   R = NTILE sobre recencia invertida (5 = más reciente).
--   F = REGLAS categóricas (no NTILE) — clave del modelo.
--   M = NTILE sobre monto ascendente (5 = más gastó).
con_scores AS (
    SELECT
        b.customer_unique_id,
        b.num_pedidos,
        b.dias_recencia,
        b.monto_total,
        b.fecha_ultima_compra,
        NTILE(5) OVER (ORDER BY b.dias_recencia DESC) AS R,
        CASE
            WHEN b.num_pedidos >= 4                                  THEN 5
            WHEN b.num_pedidos = 3                                   THEN 4
            WHEN b.num_pedidos = 2                                   THEN 3
            WHEN b.num_pedidos = 1 AND b.monto_total >= p.p75_monto  THEN 2
            ELSE                                                          1
        END AS F,
        NTILE(5) OVER (ORDER BY b.monto_total ASC) AS M
    FROM base b
    CROSS JOIN p75 p
)
INSERT INTO mart.p2_rfm_clientes (
    customer_unique_id, num_pedidos, dias_recencia, monto_total,
    R, F, M, segmento, ingreso_brl, fecha_ultima_compra
)
SELECT
    customer_unique_id,
    num_pedidos,
    dias_recencia,
    CAST(monto_total AS DECIMAL(12,2))                                AS monto_total,
    R, F, M,
    -- Segmento por combinación R × F. Orden secuencial importa.
    CASE
        WHEN F >= 3                  THEN N'Champions'              -- recurrentes verdaderos
        WHEN F = 2 AND R >= 4        THEN N'VIP recientes'          -- one-time grande + reciente
        WHEN F = 2 AND R <= 2        THEN N'En riesgo de fuga'      -- one-time grande + antiguo
        WHEN F = 1 AND R <= 2        THEN N'Dormidos'               -- one-time chico + antiguo
        WHEN F = 1 AND R >= 4        THEN N'Recientes potenciales'  -- one-time chico + reciente
        ELSE                              N'Estables'                -- resto (R medio)
    END AS segmento,
    CAST(monto_total AS DECIMAL(12,2)) AS ingreso_brl,
    fecha_ultima_compra
FROM con_scores;
GO


-- ============================================================================
-- MART 3: mart.p3_rutas_problematicas
-- ============================================================================
-- Grano:    una fila por par (estado_origen, estado_destino).
-- Filas:    ~412 (de 729 teóricas si todos los pares tuvieran tráfico).
-- Pregunta: ¿en qué rutas se concentran los retrasos?
-- Doble JOIN a DIM_GEOGRAFIA (role-playing): g_ven = origen, g_cli = destino.
-- ============================================================================

IF OBJECT_ID('mart.p3_rutas_problematicas','U') IS NOT NULL
    DROP TABLE mart.p3_rutas_problematicas;
GO

CREATE TABLE mart.p3_rutas_problematicas (
    estado_origen         VARCHAR(4)    NOT NULL,   -- ej: "SP" (vendedor)
    estado_destino        VARCHAR(4)    NOT NULL,   -- ej: "RJ" (cliente)
    region_origen         VARCHAR(20)   NOT NULL,
    region_destino        VARCHAR(20)   NOT NULL,
    es_intra_estado       BIT           NOT NULL,   -- 1 si origen = destino
    total_envios          INT           NOT NULL,
    dias_promedio_entrega DECIMAL(5,1)  NOT NULL,
    dias_retraso_promedio DECIMAL(5,1),             -- NULL si nunca se atrasó
    pct_a_tiempo          DECIMAL(5,2)  NOT NULL,
    pct_retraso_critico   DECIMAL(5,2)  NOT NULL,   -- % con retraso > 7 días
    ingreso_brl           DECIMAL(14,2) NOT NULL,
    ranking_problemas     INT           NOT NULL,   -- 1 = ruta más problemática
    CONSTRAINT pk_p3 PRIMARY KEY (estado_origen, estado_destino)
);
GO

TRUNCATE TABLE mart.p3_rutas_problematicas;
GO

WITH base AS (
    SELECT
        g_ven.estado AS estado_origen,
        g_cli.estado AS estado_destino,
        g_ven.region AS region_origen,
        g_cli.region AS region_destino,
        CASE WHEN g_ven.estado = g_cli.estado THEN 1 ELSE 0 END     AS es_intra_estado,
        COUNT(*)                                                    AS total_envios,
        CAST(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(7,1))) AS DECIMAL(5,1))
                                                                    AS dias_promedio_entrega,
        -- Solo cuenta retrasos positivos (cuán mal se atrasa cuando se atrasa).
        CAST(AVG(CAST(CASE WHEN f.dias_retraso > 0 THEN f.dias_retraso END AS DECIMAL(7,1))) AS DECIMAL(5,1))
                                                                    AS dias_retraso_promedio,
        CAST(100.0 * AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) AS DECIMAL(5,2))
                                                                    AS pct_a_tiempo,
        CAST(100.0 * SUM(CASE WHEN f.dias_retraso > 7 THEN 1 ELSE 0 END) / COUNT(*) AS DECIMAL(5,2))
                                                                    AS pct_retraso_critico,
        CAST(SUM(f.valor_total) AS DECIMAL(14,2))                   AS ingreso_brl
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_GEOGRAFIA g_ven ON f.id_geografia_ven = g_ven.id_geografia
    JOIN dbo.DIM_GEOGRAFIA g_cli ON f.id_geografia_cli = g_cli.id_geografia
    WHERE f.estado_pedido = 'delivered'
      AND g_ven.estado IS NOT NULL
      AND g_cli.estado IS NOT NULL
    GROUP BY
        g_ven.estado, g_cli.estado,
        g_ven.region, g_cli.region,
        CASE WHEN g_ven.estado = g_cli.estado THEN 1 ELSE 0 END
)
INSERT INTO mart.p3_rutas_problematicas (
    estado_origen, estado_destino, region_origen, region_destino,
    es_intra_estado, total_envios,
    dias_promedio_entrega, dias_retraso_promedio,
    pct_a_tiempo, pct_retraso_critico,
    ingreso_brl, ranking_problemas
)
SELECT
    estado_origen, estado_destino, region_origen, region_destino,
    es_intra_estado, total_envios,
    dias_promedio_entrega, dias_retraso_promedio,
    pct_a_tiempo, pct_retraso_critico,
    ingreso_brl,
    ROW_NUMBER() OVER (ORDER BY pct_retraso_critico DESC, total_envios DESC) AS ranking_problemas
FROM base;
GO


-- ============================================================================
-- MART 4: mart.p4_vendedores_scorecard
-- ============================================================================
-- Grano:    una fila por vendedor.
-- Filas:    ~3,094 (de 3,095 en DIM_VENDEDOR; 1 nunca vendió).
-- Pregunta: ¿qué vendedores son Elite/Estándar/En observación/Crítico?
-- SIN filtro estado_pedido (cancelaciones son señal de calidad).
-- ============================================================================

IF OBJECT_ID('mart.p4_vendedores_scorecard','U') IS NOT NULL
    DROP TABLE mart.p4_vendedores_scorecard;
GO

CREATE TABLE mart.p4_vendedores_scorecard (
    id_vendedor      VARCHAR(50)   NOT NULL PRIMARY KEY,
    estado_vendedor  VARCHAR(4),
    region_vendedor  VARCHAR(20),
    num_pedidos      INT           NOT NULL,
    num_items        INT           NOT NULL,
    ingreso_brl      DECIMAL(14,2) NOT NULL,
    rating_promedio  DECIMAL(3,2),                    -- NULL si no tiene reseñas
    pct_a_tiempo     DECIMAL(5,2)  NOT NULL,
    pct_cancelados   DECIMAL(5,2)  NOT NULL,
    pct_resena_mala  DECIMAL(5,2),
    semaforo         NVARCHAR(15)  NOT NULL,          -- Elite/Estándar/En observación/Crítico
    ranking_ingreso  INT           NOT NULL
);
GO

TRUNCATE TABLE mart.p4_vendedores_scorecard;
GO

WITH
-- CTE 1: operativo (SIN filtro estado_pedido — cancelaciones cuentan).
base AS (
    SELECT
        id_vendedor,
        COUNT(DISTINCT id_pedido)                                            AS num_pedidos,
        COUNT(*)                                                             AS num_items,
        SUM(valor_total)                                                     AS ingreso_brl,
        100.0 * AVG(CAST(entrego_a_tiempo AS DECIMAL(5,2)))                  AS pct_a_tiempo,
        100.0 * SUM(CASE WHEN estado_pedido = 'canceled' THEN 1 ELSE 0 END) / COUNT(*)
                                                                             AS pct_cancelados
    FROM dbo.FACT_VENTAS
    GROUP BY id_vendedor
),
-- CTE 2: rating + % reseña mala (universo: pedidos con reseña).
con_resenas AS (
    SELECT
        f.id_vendedor,
        AVG(CAST(r.puntuacion_review AS DECIMAL(5,2)))                       AS rating_promedio,
        100.0 * SUM(CASE WHEN r.puntuacion_review <= 2 THEN 1 ELSE 0 END) / COUNT(*)
                                                                             AS pct_resena_mala
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_RESENA r ON f.id_pedido = r.id_pedido
    GROUP BY f.id_vendedor
),
-- CTE 3: geografía del vendedor (DIM_VENDEDOR → DIM_GEOGRAFIA snowflake).
con_geo AS (
    SELECT
        v.id_vendedor,
        g.estado AS estado_vendedor,
        g.region AS region_vendedor
    FROM dbo.DIM_VENDEDOR v
    LEFT JOIN dbo.DIM_GEOGRAFIA g ON v.id_geografia = g.id_geografia
)
INSERT INTO mart.p4_vendedores_scorecard (
    id_vendedor, estado_vendedor, region_vendedor,
    num_pedidos, num_items, ingreso_brl,
    rating_promedio, pct_a_tiempo, pct_cancelados, pct_resena_mala,
    semaforo, ranking_ingreso
)
SELECT
    b.id_vendedor,
    cg.estado_vendedor,
    cg.region_vendedor,
    b.num_pedidos,
    b.num_items,
    CAST(b.ingreso_brl       AS DECIMAL(14,2)) AS ingreso_brl,
    CAST(cr.rating_promedio  AS DECIMAL(3,2)) AS rating_promedio,
    CAST(b.pct_a_tiempo      AS DECIMAL(5,2)) AS pct_a_tiempo,
    CAST(b.pct_cancelados    AS DECIMAL(5,2)) AS pct_cancelados,
    CAST(cr.pct_resena_mala  AS DECIMAL(5,2)) AS pct_resena_mala,
    -- SEMÁFORO — orden secuencial CRÍTICO:
    -- Si un vendedor cumple Crítico Y Observación, debe quedar Crítico.
    CASE
        WHEN cr.rating_promedio < 3.5 OR b.pct_a_tiempo < 80
            THEN N'Crítico'
        WHEN cr.rating_promedio >= 4.5 AND b.pct_a_tiempo >= 95 AND b.pct_cancelados < 2
            THEN N'Elite'
        WHEN b.pct_cancelados >= 5 OR cr.pct_resena_mala >= 25
            THEN N'En observación'
        ELSE N'Estándar'
    END AS semaforo,
    ROW_NUMBER() OVER (ORDER BY b.ingreso_brl DESC) AS ranking_ingreso
FROM base b
LEFT JOIN con_resenas cr ON b.id_vendedor = cr.id_vendedor
LEFT JOIN con_geo cg     ON b.id_vendedor = cg.id_vendedor;
GO


-- ============================================================================
-- MART 5a: mart.p5_distribucion_puntuacion
-- ============================================================================
-- Grano:    una fila por puntuación (1-5). 5 filas totales.
-- Universo: DIM_RESENA completa (no necesita JOIN).
-- Pregunta: ¿cómo se distribuyen las reseñas?
-- ============================================================================

IF OBJECT_ID('mart.p5_distribucion_puntuacion','U') IS NOT NULL
    DROP TABLE mart.p5_distribucion_puntuacion;
GO

CREATE TABLE mart.p5_distribucion_puntuacion (
    puntuacion         TINYINT       NOT NULL PRIMARY KEY,
    num_resenas        INT           NOT NULL,
    pct                DECIMAL(5,2)  NOT NULL,   -- % sobre total reseñas
    pct_con_comentario DECIMAL(5,2)  NOT NULL    -- % con escribio_comentario=1
);
GO

TRUNCATE TABLE mart.p5_distribucion_puntuacion;
GO

INSERT INTO mart.p5_distribucion_puntuacion (
    puntuacion, num_resenas, pct, pct_con_comentario
)
SELECT
    puntuacion_review AS puntuacion,
    COUNT(*) AS num_resenas,
    CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS pct,
    CAST(100.0 * SUM(CAST(escribio_comentario AS DECIMAL(5,2))) / COUNT(*) AS DECIMAL(5,2))
                                                                    AS pct_con_comentario
FROM dbo.DIM_RESENA
GROUP BY puntuacion_review;
GO


-- ============================================================================
-- MART 5b: mart.p5_satisfaccion_por_mes
-- ============================================================================
-- Grano:    una fila por (anio, mes). 24 filas (Sep 2016 – Sep 2018).
-- Pregunta: ¿cómo evolucionó la satisfacción en el tiempo?
-- Decisión clave: DISTINCT por pedido para evitar ponderar por items
--                  (1 pedido con 3 items NO debe contar 3 veces).
-- ============================================================================

IF OBJECT_ID('mart.p5_satisfaccion_por_mes','U') IS NOT NULL
    DROP TABLE mart.p5_satisfaccion_por_mes;
GO

CREATE TABLE mart.p5_satisfaccion_por_mes (
    anio            SMALLINT      NOT NULL,
    mes             TINYINT       NOT NULL,
    num_resenas     INT           NOT NULL,
    rating_promedio DECIMAL(3,2)  NOT NULL,
    pct_positivas   DECIMAL(5,2)  NOT NULL,   -- % ★4-★5
    pct_negativas   DECIMAL(5,2)  NOT NULL,   -- % ★1-★2
    nps_estimado    DECIMAL(5,2)  NOT NULL,   -- pct_positivas - pct_negativas
    CONSTRAINT pk_p5m PRIMARY KEY (anio, mes)
);
GO

TRUNCATE TABLE mart.p5_satisfaccion_por_mes;
GO

WITH
-- CTE 1: una fila por reseña única (DISTINCT deduplica items del mismo pedido).
resenas_con_fecha AS (
    SELECT DISTINCT
        f.id_pedido,
        r.puntuacion_review,
        t.anio,
        t.mes
    FROM dbo.FACT_VENTAS f
    INNER JOIN dbo.DIM_RESENA r ON f.id_pedido = r.id_pedido
    INNER JOIN dbo.DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
),
-- CTE 2: agregado mensual (raw).
agregado AS (
    SELECT
        anio,
        mes,
        COUNT(*) AS num_resenas,
        AVG(CAST(puntuacion_review AS DECIMAL(5,2)))                              AS rating_promedio,
        100.0 * SUM(CASE WHEN puntuacion_review >= 4 THEN 1 ELSE 0 END) / COUNT(*) AS pct_positivas,
        100.0 * SUM(CASE WHEN puntuacion_review <= 2 THEN 1 ELSE 0 END) / COUNT(*) AS pct_negativas
    FROM resenas_con_fecha
    GROUP BY anio, mes
)
INSERT INTO mart.p5_satisfaccion_por_mes (
    anio, mes, num_resenas, rating_promedio,
    pct_positivas, pct_negativas, nps_estimado
)
SELECT
    CAST(anio AS SMALLINT) AS anio,
    CAST(mes  AS TINYINT)  AS mes,
    num_resenas,
    CAST(rating_promedio                AS DECIMAL(3,2)) AS rating_promedio,
    CAST(pct_positivas                  AS DECIMAL(5,2)) AS pct_positivas,
    CAST(pct_negativas                  AS DECIMAL(5,2)) AS pct_negativas,
    CAST(pct_positivas - pct_negativas  AS DECIMAL(5,2)) AS nps_estimado
FROM agregado
ORDER BY anio, mes;
GO


-- ============================================================================
-- MART 5c: mart.p5_palabras_frecuentes
-- ============================================================================
-- Grano:    una fila por (palabra, n_gram, score_grupo). 800 filas (4×200 top).
-- Pregunta: ¿qué dicen los clientes en los comentarios?
-- IMPORTANTE: este mart NO se llena con SQL puro.
-- Se llena con Python (cargar_palabras_p5.py) porque requiere:
--   - Tokenización con regex de letras (incluye acentos PT/ES)
--   - Filtros de stopwords portugués + español + contextuales (~250 palabras)
--   - Generación de bigramas (pares consecutivos)
--   - Top 200 por (grupo, n_gram), filtrando freq >= 3
-- ============================================================================

IF OBJECT_ID('mart.p5_palabras_frecuentes','U') IS NOT NULL
    DROP TABLE mart.p5_palabras_frecuentes;
GO

CREATE TABLE mart.p5_palabras_frecuentes (
    palabra      NVARCHAR(120) NOT NULL,    -- 120 para acomodar bigramas (60+1+60)
    n_gram       TINYINT       NOT NULL,    -- 1 = unigrama, 2 = bigrama
    score_grupo  VARCHAR(10)   NOT NULL,    -- 'negativa' (★1-2) o 'positiva' (★4-5)
    frecuencia   INT           NOT NULL,
    CONSTRAINT pk_p5p PRIMARY KEY (palabra, n_gram, score_grupo)
);
GO

-- La carga se hace desde Python. Ejecutar:
--    python olist_dashboard/etl/cargar_palabras_p5.py
-- (forma parte del orquestador refresh_marts.py).


-- ============================================================================
-- FIN DEL SCHEMA mart — 7 tablas, 97,692 filas totales después del refresh
-- ============================================================================
-- Para regenerar TODO desde cero (incluyendo el NLP de p5_palabras_frecuentes):
--    python olist_dashboard/etl/refresh_marts.py     (~6 segundos)
-- ============================================================================
