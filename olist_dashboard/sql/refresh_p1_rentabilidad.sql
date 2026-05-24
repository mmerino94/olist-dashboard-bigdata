-- =============================================================================
-- refresh_p1_rentabilidad.sql — Carga de mart.p1_rentabilidad_categoria
-- =============================================================================
-- Problema de negocio:   P1 — Rentabilidad por categoría.
-- Grano:                 una fila por categoría de producto.
-- Filas esperadas:       ~73 (número de categorías distintas en DIM_PRODUCTO).
-- Filtro aplicado:       estado_pedido IN ('delivered','shipped')
--                        (ingreso real o garantizado, ver HANDOFF §5).
-- Hallazgo esperado:     "Salud y belleza" #1 con ~9.2% del ingreso total.
-- Spec:                  HANDOFF_DATAMART.md §6.1.
-- Idempotente:           el TRUNCATE garantiza que re-ejecutar no duplica filas.
-- =============================================================================

USE OlistDW;
GO

TRUNCATE TABLE mart.p1_rentabilidad_categoria;
GO

-- ---------------------------------------------------------------------------
-- CTEs (base, con_resenas, total_global) + INSERT con lista explícita.
-- En SQL Server el WITH debe ir ANTES del INSERT INTO, no entre INSERT y SELECT.
-- ---------------------------------------------------------------------------
-- --- base: agregaciones por categoría sobre FACT_VENTAS + DIM_PRODUCTO.
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
-- --- con_resenas: rating promedio y % de reseña mala por categoría
-- ---              (JOIN explícito a DIM_RESENA vía id_pedido).
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
-- --- total_global: gran total para calcular pct_individual y pct_acumulado.
total_global AS (
    SELECT SUM(ingreso_brl) AS gran_total FROM base
)
-- --- INSERT con lista explícita de columnas (orden blindado contra cambios DDL).
INSERT INTO mart.p1_rentabilidad_categoria (
    ranking,
    categoria,
    items_vendidos,
    pedidos_distintos,
    ingreso_brl,
    ticket_promedio,
    pct_individual,
    pct_acumulado,
    flete_sobre_precio,
    rating_promedio,
    pct_resena_mala,
    pct_retraso,
    es_categoria_trampa,
    es_categoria_estrella
)
-- --- SELECT final: ranking, métricas, flags categoría-trampa / estrella.
SELECT
    ROW_NUMBER() OVER (ORDER BY b.ingreso_brl DESC) AS ranking,
    b.categoria,
    b.items_vendidos,
    b.pedidos_distintos,
    CAST(b.ingreso_brl AS DECIMAL(14,2)) AS ingreso_brl,
    CAST(b.ticket_promedio AS DECIMAL(10,2)) AS ticket_promedio,
    CAST(b.ingreso_brl / tg.gran_total * 100 AS DECIMAL(5,2)) AS pct_individual,
    CAST(SUM(b.ingreso_brl) OVER (ORDER BY b.ingreso_brl DESC) / tg.gran_total * 100 AS DECIMAL(5,2)) AS pct_acumulado,
    CAST(b.flete_pct AS DECIMAL(5,2)) AS flete_sobre_precio,
    CAST(cr.rating_promedio AS DECIMAL(3,2)) AS rating_promedio,
    CAST(ISNULL(cr.pct_resena_mala, 0) AS DECIMAL(5,2)) AS pct_resena_mala,
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
GO

-- ---------------------------------------------------------------------------
-- Verificación rápida post-carga.
-- ---------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM mart.p1_rentabilidad_categoria) AS filas_cargadas,
    (SELECT TOP 1 categoria FROM mart.p1_rentabilidad_categoria ORDER BY ranking) AS categoria_top1,
    (SELECT TOP 1 pct_individual FROM mart.p1_rentabilidad_categoria ORDER BY ranking) AS pct_top1;
GO
