-- =============================================================================
-- refresh_p3_logistica.sql — Carga de mart.p3_rutas_problematicas
-- =============================================================================
-- Problema de negocio:   P3 — Control de tiempos de entrega.
-- Grano:                 una fila por par (estado_origen, estado_destino).
-- Filas esperadas:       400-500 rutas (máx teórico 27×27 = 729; en práctica
--                        menos porque no todas las rutas tienen tráfico).
-- Filtro aplicado:       estado_pedido = 'delivered' (único universo con
--                        dias_retraso y entrego_a_tiempo válidos).
-- Ranking:               por (pct_retraso_critico DESC, total_envios DESC).
--                        ranking_problemas = 1 → ruta más problemática.
-- Spec:                  HANDOFF_DATAMART.md §6.3.
--
-- Detalles de diseño:
--   - Doble JOIN a DIM_GEOGRAFIA con aliases distintos: g_ven (rol vendedor =
--     origen) y g_cli (rol cliente = destino). Gracias al diseño starflake
--     (HANDOFF §3.5), FACT_VENTAS tiene id_geografia_ven e id_geografia_cli
--     directamente, evitando pasar por DIM_VENDEDOR/DIM_CLIENTE.
--   - Región tomada de DIM_GEOGRAFIA.region (poblada por load.py con el
--     mapping IBGE en config.py); no se usa CASE estado→región.
--   - dias_retraso_promedio: solo cuenta retrasos positivos (dias_retraso > 0)
--     para que el promedio refleje "cuánto se atrasa cuando se atrasa". Si una
--     ruta nunca se atrasa, queda NULL (DDL admite NULL en esa columna).
--   - pct_retraso_critico: pedidos con dias_retraso > 7 (umbral del HANDOFF §1.6).
--
-- Idempotente: TRUNCATE + INSERT.
-- =============================================================================

USE OlistDW;
GO

TRUNCATE TABLE mart.p3_rutas_problematicas;
GO

-- ---------------------------------------------------------------------------
-- CTE base + INSERT con lista explícita (WITH antes de INSERT — SQL Server).
-- ---------------------------------------------------------------------------
-- --- base: agrega métricas por par (estado_origen, estado_destino).
WITH base AS (
    SELECT
        g_ven.estado AS estado_origen,
        g_cli.estado AS estado_destino,
        g_ven.region AS region_origen,
        g_cli.region AS region_destino,
        CASE WHEN g_ven.estado = g_cli.estado THEN 1 ELSE 0 END AS es_intra_estado,
        COUNT(*) AS total_envios,
        CAST(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(7,1))) AS DECIMAL(5,1)) AS dias_promedio_entrega,
        CAST(AVG(CAST(CASE WHEN f.dias_retraso > 0 THEN f.dias_retraso END AS DECIMAL(7,1))) AS DECIMAL(5,1)) AS dias_retraso_promedio,
        CAST(100.0 * AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) AS DECIMAL(5,2)) AS pct_a_tiempo,
        CAST(100.0 * SUM(CASE WHEN f.dias_retraso > 7 THEN 1 ELSE 0 END) / COUNT(*) AS DECIMAL(5,2)) AS pct_retraso_critico,
        CAST(SUM(f.valor_total) AS DECIMAL(14,2)) AS ingreso_brl
    FROM dbo.FACT_VENTAS f
    JOIN dbo.DIM_GEOGRAFIA g_ven ON f.id_geografia_ven = g_ven.id_geografia
    JOIN dbo.DIM_GEOGRAFIA g_cli ON f.id_geografia_cli = g_cli.id_geografia
    WHERE f.estado_pedido = 'delivered'
      AND g_ven.estado IS NOT NULL
      AND g_cli.estado IS NOT NULL
    GROUP BY
        g_ven.estado,
        g_cli.estado,
        g_ven.region,
        g_cli.region,
        CASE WHEN g_ven.estado = g_cli.estado THEN 1 ELSE 0 END
)
-- --- INSERT con lista explícita (orden blindado contra cambios DDL).
INSERT INTO mart.p3_rutas_problematicas (
    estado_origen,
    estado_destino,
    region_origen,
    region_destino,
    es_intra_estado,
    total_envios,
    dias_promedio_entrega,
    dias_retraso_promedio,
    pct_a_tiempo,
    pct_retraso_critico,
    ingreso_brl,
    ranking_problemas
)
-- --- SELECT final: aplica ranking_problemas con ROW_NUMBER.
SELECT
    estado_origen,
    estado_destino,
    region_origen,
    region_destino,
    es_intra_estado,
    total_envios,
    dias_promedio_entrega,
    dias_retraso_promedio,
    pct_a_tiempo,
    pct_retraso_critico,
    ingreso_brl,
    ROW_NUMBER() OVER (ORDER BY pct_retraso_critico DESC, total_envios DESC) AS ranking_problemas
FROM base;
GO

-- ---------------------------------------------------------------------------
-- Verificación rápida post-carga.
-- ---------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM mart.p3_rutas_problematicas) AS total_rutas,
    (SELECT COUNT(DISTINCT estado_origen) FROM mart.p3_rutas_problematicas) AS estados_origen_distintos,
    (SELECT COUNT(DISTINCT estado_destino) FROM mart.p3_rutas_problematicas) AS estados_destino_distintos,
    (SELECT SUM(CASE WHEN es_intra_estado = 1 THEN 1 ELSE 0 END) FROM mart.p3_rutas_problematicas) AS rutas_intra,
    (SELECT COUNT(DISTINCT region_origen) FROM mart.p3_rutas_problematicas) AS regiones_distintas;
GO
