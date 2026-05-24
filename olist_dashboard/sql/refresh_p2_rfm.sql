-- =============================================================================
-- refresh_p2_rfm.sql — Carga de mart.p2_rfm_clientes
-- =============================================================================
-- Problema de negocio:   P2 — Retención / segmentación RFM.
-- Grano:                 una fila por customer_unique_id (cliente real, no por orden).
-- Filas esperadas:       ~93,285 (clientes únicos con pedidos delivered).
-- Filtro aplicado:       estado_pedido = 'delivered' (solo clientes que sí recibieron).
-- Fecha de corte:        '2018-09-01' hardcoded (día siguiente al último pedido del dataset).
--                        Documentado en HANDOFF §8.5.
-- Spec:                  HANDOFF_DATAMART.md §6.2.
--
-- DECISIÓN TÉCNICA NO NEGOCIABLE: F (frecuencia) se calcula por REGLAS CATEGÓRICAS,
-- NO por NTILE. El 97% de los clientes Olist son one-time buyers (num_pedidos=1);
-- NTILE rompería matemáticamente al repartir valores idénticos en quintiles
-- distintos. R y M sí usan NTILE(5) porque tienen varianza suficiente.
--
-- Hallazgo esperado: ~97% de clientes en F=1 o F=2 (one-time). Mayoría en
-- "Dormidos" (R bajo + F=1) o "Estables" (resto).
--
-- Idempotente: TRUNCATE + INSERT garantizan que re-ejecutar no duplica filas.
-- =============================================================================

USE OlistDW;
GO

TRUNCATE TABLE mart.p2_rfm_clientes;
GO

-- ---------------------------------------------------------------------------
-- CTEs (base, p75, con_scores) + INSERT con lista explícita.
-- En SQL Server el WITH debe ir ANTES del INSERT INTO (no entre INSERT y SELECT).
-- ---------------------------------------------------------------------------
-- --- base: agregaciones por cliente real (customer_unique_id).
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
-- --- p75: percentil 75 del monto (valor escalar único).
-- ---       Alternativa al PERCENTILE_CONT con DISTINCT OVER() que SQL Server
-- ---       no permite. MAX() colapsa el OVER() en un escalar.
p75 AS (
    SELECT MAX(p75_monto) AS p75_monto
    FROM (
        SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY monto_total) OVER () AS p75_monto
        FROM base
    ) x
),
-- --- con_scores: aplica R, F, M sobre cada cliente.
-- ---       R = NTILE(5) sobre recencia invertida (5 = más reciente).
-- ---       F = reglas categóricas (NO NTILE — ver decisión técnica del header).
-- ---       M = NTILE(5) sobre monto ascendente (5 = más gastó).
con_scores AS (
    SELECT
        b.customer_unique_id,
        b.num_pedidos,
        b.dias_recencia,
        b.monto_total,
        b.fecha_ultima_compra,
        NTILE(5) OVER (ORDER BY b.dias_recencia DESC) AS R,
        CASE
            WHEN b.num_pedidos >= 4 THEN 5
            WHEN b.num_pedidos = 3  THEN 4
            WHEN b.num_pedidos = 2  THEN 3
            WHEN b.num_pedidos = 1 AND b.monto_total >= p.p75_monto THEN 2
            ELSE 1
        END AS F,
        NTILE(5) OVER (ORDER BY b.monto_total ASC) AS M
    FROM base b
    CROSS JOIN p75 p
)
-- --- INSERT con lista explícita de columnas (orden blindado contra cambios DDL).
INSERT INTO mart.p2_rfm_clientes (
    customer_unique_id,
    num_pedidos,
    dias_recencia,
    monto_total,
    R,
    F,
    M,
    segmento,
    ingreso_brl,
    fecha_ultima_compra
)
-- --- SELECT final: asignación de segmento por reglas combinadas de R y F.
SELECT
    customer_unique_id,
    num_pedidos,
    dias_recencia,
    CAST(monto_total AS DECIMAL(12,2)) AS monto_total,
    R,
    F,
    M,
    CASE
        WHEN F >= 3                  THEN N'Champions'
        WHEN F = 2 AND R >= 4        THEN N'VIP recientes'
        WHEN F = 2 AND R <= 2        THEN N'En riesgo de fuga'
        WHEN F = 1 AND R <= 2        THEN N'Dormidos'
        WHEN F = 1 AND R >= 4        THEN N'Recientes potenciales'
        ELSE                              N'Estables'
    END AS segmento,
    CAST(monto_total AS DECIMAL(12,2)) AS ingreso_brl,
    fecha_ultima_compra
FROM con_scores;
GO

-- ---------------------------------------------------------------------------
-- Verificación rápida post-carga.
-- ---------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM mart.p2_rfm_clientes) AS total_clientes,
    (SELECT COUNT(*) FROM mart.p2_rfm_clientes WHERE num_pedidos = 1) AS one_time,
    (SELECT COUNT(*) FROM mart.p2_rfm_clientes WHERE num_pedidos >= 2) AS recurrentes,
    (SELECT COUNT(DISTINCT segmento) FROM mart.p2_rfm_clientes) AS num_segmentos;
GO
