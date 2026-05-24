-- =============================================================================
-- refresh_p4_vendedores.sql — Carga de mart.p4_vendedores_scorecard
-- =============================================================================
-- Problema de negocio:   P4 — Desempeño de vendedores (semáforo Elite / Estándar /
--                        En observación / Crítico).
-- Grano:                 una fila por id_vendedor.
-- Filas esperadas:       ~3,095 (todos los vendedores con al menos un pedido).
-- Filtro:                NINGUNO sobre estado_pedido. Las cancelaciones y demás
--                        estados SÍ cuentan — son señal directa de la calidad
--                        del vendedor (ver HANDOFF §5, tabla de filtros por
--                        problema).
-- Spec:                  HANDOFF_DATAMART.md §6.4.
--
-- Reglas del semáforo (orden de evaluación importante — CASE secuencial):
--   1. Crítico         si rating < 3.5  OR  pct_a_tiempo < 80
--   2. Elite           si rating >= 4.5 AND pct_a_tiempo >= 95 AND pct_cancelados < 2
--   3. En observación  si pct_cancelados >= 5 OR pct_resena_mala >= 25
--   4. Estándar        resto.
--
-- Si un vendedor NO tiene reseñas (rating_promedio NULL), las condiciones
-- `< 3.5` y `>= 4.5` retornan UNKNOWN → no se cumplen. Eso es deliberado:
-- sin evidencia no podemos certificar Elite, pero pct_a_tiempo < 80 sigue
-- pudiendo marcarlo Crítico por operación.
--
-- Idempotente: TRUNCATE + INSERT.
-- =============================================================================

USE OlistDW;
GO

TRUNCATE TABLE mart.p4_vendedores_scorecard;
GO

-- ---------------------------------------------------------------------------
-- CTEs (base, con_resenas, con_geo) + INSERT con lista explícita.
-- En SQL Server el WITH debe ir ANTES del INSERT INTO.
-- ---------------------------------------------------------------------------
-- --- base: agregaciones operativas por vendedor (SIN filtro estado_pedido).
-- ---       Las cancelaciones SÍ cuentan, son señal de calidad del vendedor.
WITH base AS (
    SELECT
        id_vendedor,
        COUNT(DISTINCT id_pedido) AS num_pedidos,
        COUNT(*) AS num_items,
        SUM(valor_total) AS ingreso_brl,
        -- AVG sobre BIT: cast a DECIMAL para evitar truncamiento a 0/1.
        -- entrego_a_tiempo es NULL para pedidos no entregados; AVG los ignora
        -- (interpretación: "% a tiempo de los pedidos efectivamente entregados").
        100.0 * AVG(CAST(entrego_a_tiempo AS DECIMAL(5,2))) AS pct_a_tiempo,
        100.0 * SUM(CASE WHEN estado_pedido = 'canceled' THEN 1 ELSE 0 END) / COUNT(*) AS pct_cancelados
    FROM dbo.FACT_VENTAS
    GROUP BY id_vendedor
),
-- --- con_resenas: rating promedio y % reseñas malas por vendedor.
-- ---              Universo: pedidos del vendedor que tienen reseña.
con_resenas AS (
    SELECT
        f.id_vendedor,
        AVG(CAST(r.puntuacion_review AS DECIMAL(5,2))) AS rating_promedio,
        100.0 * SUM(CASE WHEN r.puntuacion_review <= 2 THEN 1 ELSE 0 END) / COUNT(*) AS pct_resena_mala
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_RESENA r ON f.id_pedido = r.id_pedido
    GROUP BY f.id_vendedor
),
-- --- con_geo: estado y región del vendedor (snowflake DIM_VENDEDOR → DIM_GEOGRAFIA).
con_geo AS (
    SELECT
        v.id_vendedor,
        g.estado AS estado_vendedor,
        g.region AS region_vendedor
    FROM dbo.DIM_VENDEDOR v
    LEFT JOIN dbo.DIM_GEOGRAFIA g ON v.id_geografia = g.id_geografia
)
-- --- INSERT con lista explícita (orden blindado contra cambios DDL).
INSERT INTO mart.p4_vendedores_scorecard (
    id_vendedor,
    estado_vendedor,
    region_vendedor,
    num_pedidos,
    num_items,
    ingreso_brl,
    rating_promedio,
    pct_a_tiempo,
    pct_cancelados,
    pct_resena_mala,
    semaforo,
    ranking_ingreso
)
-- --- SELECT final: aplica semáforo + ranking de ingreso.
SELECT
    b.id_vendedor,
    cg.estado_vendedor,
    cg.region_vendedor,
    b.num_pedidos,
    b.num_items,
    CAST(b.ingreso_brl AS DECIMAL(14,2)) AS ingreso_brl,
    CAST(cr.rating_promedio AS DECIMAL(3,2)) AS rating_promedio,
    CAST(b.pct_a_tiempo AS DECIMAL(5,2)) AS pct_a_tiempo,
    CAST(b.pct_cancelados AS DECIMAL(5,2)) AS pct_cancelados,
    CAST(cr.pct_resena_mala AS DECIMAL(5,2)) AS pct_resena_mala,
    CASE
        -- 1. Crítico primero: si cae aquí, queda Crítico aunque también cumpla "En observación".
        WHEN cr.rating_promedio < 3.5 OR b.pct_a_tiempo < 80
            THEN N'Crítico'
        -- 2. Elite: requiere rating >= 4.5 (NULL no cumple → Elite exige evidencia).
        WHEN cr.rating_promedio >= 4.5 AND b.pct_a_tiempo >= 95 AND b.pct_cancelados < 2
            THEN N'Elite'
        -- 3. En observación: señales de alerta operativa o de satisfacción.
        WHEN b.pct_cancelados >= 5 OR cr.pct_resena_mala >= 25
            THEN N'En observación'
        -- 4. Estándar: el resto (incluye vendedores sin reseñas y KPIs OK).
        ELSE N'Estándar'
    END AS semaforo,
    ROW_NUMBER() OVER (ORDER BY b.ingreso_brl DESC) AS ranking_ingreso
FROM base b
LEFT JOIN con_resenas cr ON b.id_vendedor = cr.id_vendedor
LEFT JOIN con_geo cg     ON b.id_vendedor = cg.id_vendedor;
GO

-- ---------------------------------------------------------------------------
-- Verificación rápida post-carga.
-- ---------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM mart.p4_vendedores_scorecard) AS total_vendedores,
    (SELECT COUNT(DISTINCT semaforo) FROM mart.p4_vendedores_scorecard) AS num_semaforos,
    (SELECT COUNT(*) FROM mart.p4_vendedores_scorecard WHERE rating_promedio IS NULL) AS sin_resenas;
GO
