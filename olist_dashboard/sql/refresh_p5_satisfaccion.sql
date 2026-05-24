-- =============================================================================
-- refresh_p5_satisfaccion.sql — Carga de las 2 sub-tablas SQL del mart P5
-- =============================================================================
-- Problema de negocio:   P5 — Causas de insatisfacción.
-- Universo:              SOLO pedidos con reseña en DIM_RESENA.
-- Sub-tablas cargadas en este archivo (las puramente SQL):
--   1) mart.p5_distribucion_puntuacion  — distribución global 1..5★ (5 filas).
--      Grano: una fila por puntuación.
--   2) mart.p5_satisfaccion_por_mes     — evolución mensual del rating + NPS estimado.
--      Grano: una fila por (anio, mes).
-- Sub-tabla NO cargada aquí (queda para refresh_marts.py):
--   3) mart.p5_palabras_frecuentes      — requiere tokenización + stopwords PT/ES
--                                          (NLP en Python, no SQL puro).
-- nps_estimado = pct_positivas − pct_negativas. Es la aproximación del HANDOFF
-- §6.5.2; NO es el NPS clásico (que requiere Promotores 9-10 vs Detractores 0-6).
-- Idempotente: TRUNCATE + INSERT en cada sub-tabla.
-- Spec: HANDOFF_DATAMART.md §6.5.1 y §6.5.2.
-- =============================================================================

USE OlistDW;
GO

-- =============================================================================
-- Sub-tabla 1: mart.p5_distribucion_puntuacion
-- -----------------------------------------------------------------------------
-- Grano: una fila por puntuacion (1..5).
-- Universo: DIM_RESENA completa (no necesita JOIN — la tabla es self-contained).
-- =============================================================================

TRUNCATE TABLE mart.p5_distribucion_puntuacion;
GO

INSERT INTO mart.p5_distribucion_puntuacion (
    puntuacion,
    num_resenas,
    pct,
    pct_con_comentario
)
SELECT
    puntuacion_review AS puntuacion,
    COUNT(*) AS num_resenas,
    CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS pct,
    CAST(100.0 * SUM(CAST(escribio_comentario AS DECIMAL(5,2))) / COUNT(*) AS DECIMAL(5,2)) AS pct_con_comentario
FROM dbo.DIM_RESENA
GROUP BY puntuacion_review;
GO

-- =============================================================================
-- Sub-tabla 2: mart.p5_satisfaccion_por_mes
-- -----------------------------------------------------------------------------
-- Grano: una fila por (anio, mes).
-- Universo: INNER JOIN FACT_VENTAS ↔ DIM_RESENA (define el universo de P5).
-- NO se filtra por estado_pedido: queremos cobertura completa de reseñas
-- (HANDOFF §5).
-- =============================================================================

TRUNCATE TABLE mart.p5_satisfaccion_por_mes;
GO

-- --- resenas_con_fecha: una fila por reseña (NO por ítem). DISTINCT sobre
-- ---                    (id_pedido, puntuacion_review, anio, mes) deduplica
-- ---                    la repetición que el grano-ítem de FACT generaría al
-- ---                    hacer JOIN con DIM_RESENA (1 reseña / pedido). Seguro
-- ---                    porque un pedido comparte id_tiempo entre sus ítems.
-- ---                    Usa t.anio y t.mes pre-calculados de DIM_TIEMPO.
WITH resenas_con_fecha AS (
    SELECT DISTINCT
        f.id_pedido,
        r.puntuacion_review,
        t.anio,
        t.mes
    FROM dbo.FACT_VENTAS f
    INNER JOIN dbo.DIM_RESENA r ON f.id_pedido = r.id_pedido
    INNER JOIN dbo.DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
),
-- --- agregado: métricas mensuales (raw, sin CAST final). Grano: una fila por (anio, mes).
agregado AS (
    SELECT
        anio,
        mes,
        COUNT(*) AS num_resenas,
        AVG(CAST(puntuacion_review AS DECIMAL(5,2))) AS rating_promedio,
        100.0 * SUM(CASE WHEN puntuacion_review >= 4 THEN 1 ELSE 0 END) / COUNT(*) AS pct_positivas,
        100.0 * SUM(CASE WHEN puntuacion_review <= 2 THEN 1 ELSE 0 END) / COUNT(*) AS pct_negativas
    FROM resenas_con_fecha
    GROUP BY anio, mes
)
-- --- INSERT con lista explícita + cálculo de nps_estimado.
INSERT INTO mart.p5_satisfaccion_por_mes (
    anio,
    mes,
    num_resenas,
    rating_promedio,
    pct_positivas,
    pct_negativas,
    nps_estimado
)
SELECT
    CAST(anio AS SMALLINT) AS anio,
    CAST(mes  AS TINYINT)  AS mes,
    num_resenas,
    CAST(rating_promedio AS DECIMAL(3,2)) AS rating_promedio,
    CAST(pct_positivas   AS DECIMAL(5,2)) AS pct_positivas,
    CAST(pct_negativas   AS DECIMAL(5,2)) AS pct_negativas,
    CAST(pct_positivas - pct_negativas AS DECIMAL(5,2)) AS nps_estimado
FROM agregado
ORDER BY anio, mes;
GO

-- ---------------------------------------------------------------------------
-- Verificación rápida post-carga.
-- ---------------------------------------------------------------------------
SELECT 'distribucion_puntuacion' AS sub_tabla,
       (SELECT COUNT(*) FROM mart.p5_distribucion_puntuacion) AS filas
UNION ALL
SELECT 'satisfaccion_por_mes',
       (SELECT COUNT(*) FROM mart.p5_satisfaccion_por_mes);
GO
