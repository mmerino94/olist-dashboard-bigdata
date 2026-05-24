-- =============================================================================
-- mart_schema.sql — DDL del schema `mart` (capa Data Mart sobre OlistDW)
-- =============================================================================
-- Crea las 7 tablas materializadas que alimentan el dashboard ejecutivo.
-- Una tabla (o conjunto) por problema de negocio (P1..P5).
-- Idempotente: se puede re-ejecutar sin error gracias a los IF OBJECT_ID/DROPs.
-- Fuente de verdad: HANDOFF_DATAMART.md §6.
-- =============================================================================

USE OlistDW;
GO

-- -----------------------------------------------------------------------------
-- Schema `mart` (idempotente)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'mart')
    EXEC('CREATE SCHEMA mart');
GO

-- -----------------------------------------------------------------------------
-- Drops idempotentes (no hay FKs entre marts, el orden no importa)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('mart.p1_rentabilidad_categoria','U')  IS NOT NULL DROP TABLE mart.p1_rentabilidad_categoria;
IF OBJECT_ID('mart.p2_rfm_clientes','U')            IS NOT NULL DROP TABLE mart.p2_rfm_clientes;
IF OBJECT_ID('mart.p3_rutas_problematicas','U')     IS NOT NULL DROP TABLE mart.p3_rutas_problematicas;
IF OBJECT_ID('mart.p4_vendedores_scorecard','U')    IS NOT NULL DROP TABLE mart.p4_vendedores_scorecard;
IF OBJECT_ID('mart.p5_distribucion_puntuacion','U') IS NOT NULL DROP TABLE mart.p5_distribucion_puntuacion;
IF OBJECT_ID('mart.p5_satisfaccion_por_mes','U')    IS NOT NULL DROP TABLE mart.p5_satisfaccion_por_mes;
IF OBJECT_ID('mart.p5_palabras_frecuentes','U')     IS NOT NULL DROP TABLE mart.p5_palabras_frecuentes;
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 1 — Rentabilidad por categoría.
-- Grano: una fila por categoría de producto. Materializa el Pareto de ingreso
-- y los flags es_categoria_trampa (flete>35%) / es_categoria_estrella.
-- Filtro: estado_pedido IN ('delivered','shipped').
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p1_rentabilidad_categoria (
    ranking               INT             NOT NULL,
    categoria             NVARCHAR(60)    NOT NULL,
    items_vendidos        INT             NOT NULL,
    pedidos_distintos     INT             NOT NULL,
    ingreso_brl           DECIMAL(14,2)   NOT NULL,
    ticket_promedio       DECIMAL(10,2)   NOT NULL,
    pct_individual        DECIMAL(5,2)    NOT NULL,
    pct_acumulado         DECIMAL(5,2)    NOT NULL,
    flete_sobre_precio    DECIMAL(5,2),
    rating_promedio       DECIMAL(3,2),
    pct_resena_mala       DECIMAL(5,2),
    pct_retraso           DECIMAL(5,2),
    es_categoria_trampa   BIT             NOT NULL,
    es_categoria_estrella BIT             NOT NULL,
    CONSTRAINT pk_p1 PRIMARY KEY (categoria)
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 2 — Segmentación RFM por cliente.
-- Grano: una fila por customer_unique_id (~93,285 filas esperadas).
-- F asignada por reglas categóricas (no NTILE) por sesgo del 97% one-time.
-- Filtro: estado_pedido = 'delivered'.
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p2_rfm_clientes (
    customer_unique_id  VARCHAR(50)   NOT NULL PRIMARY KEY,
    num_pedidos         INT           NOT NULL,
    dias_recencia       INT           NOT NULL,
    monto_total         DECIMAL(12,2) NOT NULL,
    R                   TINYINT       NOT NULL,
    F                   TINYINT       NOT NULL,
    M                   TINYINT       NOT NULL,
    segmento            NVARCHAR(30)  NOT NULL,
    ingreso_brl         DECIMAL(12,2) NOT NULL,
    fecha_ultima_compra DATE          NOT NULL
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 3 — Rutas logísticas problemáticas.
-- Grano: una fila por par (estado_origen, estado_destino).
-- Filtro: estado_pedido = 'delivered' (único universo con dias_retraso válido).
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p3_rutas_problematicas (
    estado_origen         VARCHAR(4)    NOT NULL,
    estado_destino        VARCHAR(4)    NOT NULL,
    region_origen         VARCHAR(20)   NOT NULL,
    region_destino        VARCHAR(20)   NOT NULL,
    es_intra_estado       BIT           NOT NULL,
    total_envios          INT           NOT NULL,
    dias_promedio_entrega DECIMAL(5,1)  NOT NULL,
    dias_retraso_promedio DECIMAL(5,1),
    pct_a_tiempo          DECIMAL(5,2)  NOT NULL,
    pct_retraso_critico   DECIMAL(5,2)  NOT NULL,
    ingreso_brl           DECIMAL(14,2) NOT NULL,
    ranking_problemas     INT           NOT NULL,
    CONSTRAINT pk_p3 PRIMARY KEY (estado_origen, estado_destino)
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 4 — Scorecard de vendedores (semáforo).
-- Grano: una fila por vendedor (~3,095 filas esperadas).
-- Semáforo: Elite / Estándar / En observación / Crítico.
-- Sin filtro de estado_pedido (las cancelaciones cuentan como mala calidad).
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p4_vendedores_scorecard (
    id_vendedor      VARCHAR(50)   NOT NULL PRIMARY KEY,
    estado_vendedor  VARCHAR(4),
    region_vendedor  VARCHAR(20),
    num_pedidos      INT           NOT NULL,
    num_items        INT           NOT NULL,
    ingreso_brl      DECIMAL(14,2) NOT NULL,
    rating_promedio  DECIMAL(3,2),
    pct_a_tiempo     DECIMAL(5,2)  NOT NULL,
    pct_cancelados   DECIMAL(5,2)  NOT NULL,
    pct_resena_mala  DECIMAL(5,2),
    semaforo         NVARCHAR(15)  NOT NULL,
    ranking_ingreso  INT           NOT NULL
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 5a — Distribución global de puntuación de reseñas.
-- Grano: una fila por puntuación (1..5). 5 filas totales.
-- Universo: DIM_RESENA completa.
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p5_distribucion_puntuacion (
    puntuacion         TINYINT       NOT NULL PRIMARY KEY,
    num_resenas        INT           NOT NULL,
    pct                DECIMAL(5,2)  NOT NULL,
    pct_con_comentario DECIMAL(5,2)  NOT NULL
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 5b — Evolución mensual de satisfacción (NPS estimado).
-- Grano: una fila por (anio, mes).
-- NPS estimado = pct_positivas (4-5★) − pct_negativas (1-2★).
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p5_satisfaccion_por_mes (
    anio            SMALLINT      NOT NULL,
    mes             TINYINT       NOT NULL,
    num_resenas     INT           NOT NULL,
    rating_promedio DECIMAL(3,2)  NOT NULL,
    pct_positivas   DECIMAL(5,2)  NOT NULL,
    pct_negativas   DECIMAL(5,2)  NOT NULL,
    nps_estimado    DECIMAL(5,2)  NOT NULL,
    CONSTRAINT pk_p5m PRIMARY KEY (anio, mes)
);
GO

-- -----------------------------------------------------------------------------
-- Data Mart Problema 5c — Palabras frecuentes en reseñas positivas vs negativas.
-- Grano: una fila por (palabra, n_gram, score_grupo).
-- n_gram = 1 (unigrama) o 2 (bigrama).
-- score_grupo = 'positiva' (4-5★) o 'negativa' (1-2★). Puntuación 3 se excluye.
-- Llenada vía Python (cargar_palabras_p5.py) con tokenización + stopwords PT/ES,
-- no por SQL puro. NVARCHAR(120) para acomodar bigramas (60 + 1 + 60).
-- -----------------------------------------------------------------------------
CREATE TABLE mart.p5_palabras_frecuentes (
    palabra     NVARCHAR(120) NOT NULL,
    n_gram      TINYINT       NOT NULL,
    score_grupo VARCHAR(10)   NOT NULL,
    frecuencia  INT           NOT NULL,
    CONSTRAINT pk_p5p PRIMARY KEY (palabra, n_gram, score_grupo)
);
GO
