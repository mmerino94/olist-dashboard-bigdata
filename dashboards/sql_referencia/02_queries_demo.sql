-- ============================================================================
-- QUERIES DE DEMO — Para ejecutar en vivo durante la presentación al docente
-- ============================================================================
-- Cada bloque está numerado para que ejecutes uno a uno en VS Code.
-- Tiempo total estimado: 3-4 minutos si las muestras todas.
-- ============================================================================

USE OlistDW;
GO


-- ============================================================================
-- 0. PANORAMA — Existen los dos schemas y sus tablas
-- ============================================================================
-- "Mostrar al docente que dbo (DW) y mart (data marts) coexisten."

SELECT
    s.name AS schema_name,
    COUNT(t.object_id) AS num_tablas
FROM sys.schemas s
LEFT JOIN sys.tables t ON s.schema_id = t.schema_id
WHERE s.name IN ('dbo','mart')
GROUP BY s.name;
-- Esperado: dbo=8, mart=7
GO

-- Listado completo de tablas mart:
SELECT s.name + '.' + t.name AS tabla
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'mart'
ORDER BY t.name;
GO


-- ============================================================================
-- 1. CONTEOS GLOBALES — La capa mart tiene datos
-- ============================================================================
-- "97,692 filas materializadas distribuidas en 7 tablas."

SELECT 'p1_rentabilidad_categoria'  AS mart, COUNT(*) AS filas FROM mart.p1_rentabilidad_categoria   UNION ALL
SELECT 'p2_rfm_clientes',                    COUNT(*)         FROM mart.p2_rfm_clientes             UNION ALL
SELECT 'p3_rutas_problematicas',             COUNT(*)         FROM mart.p3_rutas_problematicas      UNION ALL
SELECT 'p4_vendedores_scorecard',            COUNT(*)         FROM mart.p4_vendedores_scorecard     UNION ALL
SELECT 'p5_distribucion_puntuacion',         COUNT(*)         FROM mart.p5_distribucion_puntuacion  UNION ALL
SELECT 'p5_satisfaccion_por_mes',            COUNT(*)         FROM mart.p5_satisfaccion_por_mes     UNION ALL
SELECT 'p5_palabras_frecuentes',             COUNT(*)         FROM mart.p5_palabras_frecuentes;
GO


-- ============================================================================
-- 2. P1 — RENTABILIDAD POR CATEGORÍA — el Pareto
-- ============================================================================
-- "Aquí se ve que Salud y belleza lidera con 9.28% del ingreso."

SELECT TOP 10
    ranking,
    categoria,
    ingreso_brl,
    pct_individual    AS '%',
    pct_acumulado     AS '% acum',
    flete_sobre_precio AS 'flete %',
    rating_promedio,
    es_categoria_trampa AS trampa
FROM mart.p1_rentabilidad_categoria
ORDER BY ranking;
GO

-- "El 35% de las categorías son trampa por flete > 35% del precio."
SELECT
    SUM(CASE WHEN es_categoria_trampa = 1 THEN 1 ELSE 0 END) AS num_trampa,
    COUNT(*)                                                  AS total,
    CAST(100.0 * SUM(CASE WHEN es_categoria_trampa = 1 THEN 1 ELSE 0 END) / COUNT(*) AS DECIMAL(5,2))
        AS pct_trampa
FROM mart.p1_rentabilidad_categoria;
GO


-- ============================================================================
-- 3. P2 — RFM CLIENTES — el 97% no vuelve
-- ============================================================================
-- "El hallazgo más impactante del proyecto."

SELECT
    COUNT(*)                                                                   AS total_clientes,
    SUM(CASE WHEN num_pedidos = 1 THEN 1 ELSE 0 END)                           AS one_time,
    CAST(100.0 * SUM(CASE WHEN num_pedidos = 1 THEN 1 ELSE 0 END) / COUNT(*) AS DECIMAL(5,2))
        AS pct_one_time
FROM mart.p2_rfm_clientes;
-- Esperado: 93,285 clientes — 90,488 one-time (97.00%)
GO

-- Distribución de los 6 segmentos accionables:
SELECT
    segmento,
    COUNT(*) AS clientes,
    CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS pct
FROM mart.p2_rfm_clientes
GROUP BY segmento
ORDER BY clientes DESC;
-- "78% es accionable: Dormidos + Recientes potenciales + Estables (todos F=1)."
GO


-- ============================================================================
-- 4. P3 — RUTAS PROBLEMÁTICAS — Nordeste es peor que Norte (contraintuitivo)
-- ============================================================================
-- "Mire profesor, lo que parecería obvio (Norte = peor) no es lo que dicen los datos."

SELECT
    region_destino,
    SUM(total_envios)                              AS envios,
    CAST(AVG(pct_a_tiempo) AS DECIMAL(5,2))        AS pct_a_tiempo_avg,
    CAST(AVG(pct_retraso_critico) AS DECIMAL(5,2)) AS pct_critico_avg,
    CAST(AVG(dias_promedio_entrega) AS DECIMAL(5,1)) AS dias_avg
FROM mart.p3_rutas_problematicas
GROUP BY region_destino
ORDER BY pct_critico_avg DESC;
-- Esperado: Nordeste 5.85% crítico (peor); Norte 3.93%; Sudeste 1.84%
GO

-- Intra-estado vs Inter-estado — el "margen sobre-calibrado"
SELECT
    es_intra_estado,
    COUNT(*)                                       AS rutas,
    SUM(total_envios)                              AS envios,
    CAST(AVG(dias_promedio_entrega) AS DECIMAL(5,1)) AS dias_avg,
    CAST(AVG(pct_a_tiempo) AS DECIMAL(5,2))        AS pct_a_tiempo_avg
FROM mart.p3_rutas_problematicas
GROUP BY es_intra_estado;
-- Esperado: intra 7.2 días / 94.15% — inter 17.7 días / 92.99%
-- Punto clave: 2.4× más rápido intra, pero solo 1.2 puntos de mejor SLA.
GO


-- ============================================================================
-- 5. P4 — VENDEDORES — calidad ≠ escala
-- ============================================================================
-- "El #2 por ingreso de Olist es Crítico. Genera dinero y daña reputación."

SELECT
    semaforo,
    COUNT(*)                                                  AS vendedores,
    CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS pct_vend,
    CAST(SUM(ingreso_brl) AS DECIMAL(14,2))                   AS ingreso,
    CAST(100.0 * SUM(ingreso_brl) / SUM(SUM(ingreso_brl)) OVER () AS DECIMAL(5,2))
        AS pct_ingreso
FROM mart.p4_vendedores_scorecard
GROUP BY semaforo
ORDER BY ingreso DESC;
-- Esperado: Estándar 42% vend / 79% ingreso (la base) — Elite 29% / 7% (calidad ≠ escala)
GO

-- Top 5 vendedores por ingreso — para ver al #2 Crítico:
SELECT TOP 5
    ranking_ingreso AS '#',
    LEFT(id_vendedor, 8) AS id,
    semaforo,
    num_pedidos,
    ingreso_brl,
    rating_promedio,
    pct_a_tiempo
FROM mart.p4_vendedores_scorecard
ORDER BY ranking_ingreso;
-- Esperado: #1 Estándar, #2 Crítico (rating 3.34, R$238K), #3-5 Estándar
GO


-- ============================================================================
-- 6. P5 — SATISFACCIÓN — distribución bimodal + asimetría
-- ============================================================================

-- La distribución de puntuaciones (bimodal):
SELECT puntuacion AS estrella, num_resenas, pct, pct_con_comentario AS '% escribe coment'
FROM mart.p5_distribucion_puntuacion
ORDER BY puntuacion;
-- Esperado: ★5 = 57.82%, ★1 = 11.47%, asimetría escritura: ★1 escribe 76.61%, ★4 solo 31.23%
GO

-- NPS estimado mensual — la "U" temporal (caída + recuperación):
SELECT
    anio, mes,
    num_resenas,
    rating_promedio,
    nps_estimado
FROM mart.p5_satisfaccion_por_mes
WHERE num_resenas >= 100   -- excluye meses-borde
ORDER BY anio, mes;
-- Esperado: bajón nov-2017 (Black Friday), mín mar-2018 (NPS 45.69), recuperación a 72.30 en ago-2018
GO

-- Top 10 bigramas negativos — los temas de queja:
SELECT TOP 10 palabra AS bigrama, frecuencia
FROM mart.p5_palabras_frecuentes
WHERE score_grupo = 'negativa' AND n_gram = 2
ORDER BY frecuencia DESC;
-- Esperado: nota fiscal, dinheiro volta, veio defeito, péssima qualidade, etc.
GO

-- Top 10 bigramas positivos — qué celebran:
SELECT TOP 10 palabra AS bigrama, frecuencia
FROM mart.p5_palabras_frecuentes
WHERE score_grupo = 'positiva' AND n_gram = 2
ORDER BY frecuencia DESC;
-- Esperado: dentro prazo, bem prazo, bem embalado, ótima qualidade, etc.
GO


-- ============================================================================
-- 7. PRUEBA DE TRAZABILIDAD — los marts cuadran con el DW dimensional
-- ============================================================================
-- "Profesor, los marts no son números inventados. Cuadran con dbo.*"

SELECT
    'FACT delivered'                                                            AS metrica,
    CAST((SELECT COUNT(*) FROM dbo.FACT_VENTAS WHERE estado_pedido='delivered') AS VARCHAR(20)) AS valor
UNION ALL
SELECT 'mart.p3 suma envios',
       CAST((SELECT SUM(total_envios) FROM mart.p3_rutas_problematicas) AS VARCHAR(20))
UNION ALL
SELECT 'Diferencia',
       CAST((SELECT COUNT(*) FROM dbo.FACT_VENTAS WHERE estado_pedido='delivered') -
            (SELECT SUM(total_envios) FROM mart.p3_rutas_problematicas) AS VARCHAR(20));
-- Esperado: diferencia = 0
GO

SELECT
    'DIM_RESENA total'                                                                  AS metrica,
    CAST((SELECT COUNT(*) FROM dbo.DIM_RESENA) AS VARCHAR(20))                          AS valor
UNION ALL
SELECT 'mart.p5_distribucion suma',
       CAST((SELECT SUM(num_resenas) FROM mart.p5_distribucion_puntuacion) AS VARCHAR(20));
-- Esperado: 98,116 = 98,116
GO


-- ============================================================================
-- FIN — Si quieres ejecutar el refresh en vivo, en terminal:
--    cd olist_dashboard
--    .venv/bin/python etl/refresh_marts.py
-- (regenera los 7 marts desde dbo.* en ~6 segundos)
-- ============================================================================
