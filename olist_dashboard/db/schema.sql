-- ============================================================================
-- Modelo físico Olist DW — versión corregida para Etapa 2 (dashboard)
-- ============================================================================
-- Cambios respecto al Avance 1:
--   1. FACT_VENTAS gana id_pedido (degenerate dim) y estado_pedido.
--      Necesario para count distinct de pedidos en P1, P2 y P4.
--   2. Nueva DIM_RESENA con grano pedido (incluye texto del comentario).
--      Necesario para análisis de texto del P5.
--   3. Reseñas se sacan de FACT_VENTAS y viven en DIM_RESENA.
--      Evita el sesgo por pedidos con varios ítems.
--   4. DIM_TIEMPO se carga con order_purchase_timestamp (fecha de compra).
-- ============================================================================

USE master;
GO

IF DB_ID('OlistDW') IS NOT NULL
BEGIN
    ALTER DATABASE OlistDW SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE OlistDW;
END
GO

CREATE DATABASE OlistDW;
GO

USE OlistDW;
GO

-- ----------------------------------------------------------------------------
-- DIMENSIONES
-- ----------------------------------------------------------------------------

CREATE TABLE DIM_TIEMPO (
    id_tiempo       INT          NOT NULL PRIMARY KEY,    -- formato YYYYMMDD
    fecha           DATE         NOT NULL,
    anio            SMALLINT     NOT NULL,
    mes             TINYINT      NOT NULL,
    trimestre       TINYINT      NOT NULL,
    dia_semana      VARCHAR(10)  NOT NULL,
    es_fin_semana   BIT          NOT NULL
);
GO

CREATE TABLE DIM_GEOGRAFIA (
    id_geografia    INT           IDENTITY(1,1) PRIMARY KEY,
    zip_prefix      VARCHAR(10)   NOT NULL,
    ciudad          NVARCHAR(60),
    estado          VARCHAR(4)    NOT NULL,
    region          VARCHAR(20)   NOT NULL,
    latitud         DECIMAL(9,6),
    longitud        DECIMAL(9,6),
    CONSTRAINT uq_geografia UNIQUE (zip_prefix, ciudad, estado)
);
GO

CREATE TABLE DIM_CLIENTE (
    id_cliente          VARCHAR(50) NOT NULL PRIMARY KEY,
    customer_unique_id  VARCHAR(50) NOT NULL,
    id_geografia        INT         NOT NULL,
    FOREIGN KEY (id_geografia) REFERENCES DIM_GEOGRAFIA(id_geografia)
);
GO
CREATE INDEX idx_cliente_unique ON DIM_CLIENTE(customer_unique_id);
GO

CREATE TABLE DIM_VENDEDOR (
    id_vendedor     VARCHAR(50) NOT NULL PRIMARY KEY,
    id_geografia    INT         NOT NULL,
    FOREIGN KEY (id_geografia) REFERENCES DIM_GEOGRAFIA(id_geografia)
);
GO

CREATE TABLE DIM_PRODUCTO (
    id_producto     VARCHAR(50)  NOT NULL PRIMARY KEY,
    categoria       NVARCHAR(60),       -- nombre traducido (en inglés vía translation.csv)
    rango_precio    VARCHAR(10),        -- Bajo / Medio / Alto
    peso_gramos     INT,
    alto_cm         DECIMAL(6,2),
    ancho_cm        DECIMAL(6,2),
    largo_cm        DECIMAL(6,2)
);
GO
CREATE INDEX idx_producto_categoria ON DIM_PRODUCTO(categoria);
GO

CREATE TABLE DIM_PAGO (
    id_pago         INT          IDENTITY(1,1) PRIMARY KEY,
    tipo_pago       VARCHAR(20)  NOT NULL,
    num_cuotas      TINYINT      NOT NULL,
    CONSTRAINT uq_pago UNIQUE (tipo_pago, num_cuotas)
);
GO

-- ----------------------------------------------------------------------------
-- DIM_RESENA (NUEVO) — grano pedido, una fila por reseña
-- ----------------------------------------------------------------------------
CREATE TABLE DIM_RESENA (
    id_resena            VARCHAR(50)   NOT NULL PRIMARY KEY,   -- review_id
    id_pedido            VARCHAR(50)   NOT NULL,               -- order_id (link a FACT)
    puntuacion_review    TINYINT       NOT NULL,               -- 1..5
    satisfaccion         VARCHAR(10)   NOT NULL,               -- Buena / Regular / Mala
    escribio_comentario  BIT           NOT NULL,
    comentario_titulo    NVARCHAR(200),
    comentario_texto     NVARCHAR(MAX),
    fecha_creacion       DATE,
    fecha_respuesta      DATE,
    CONSTRAINT uq_resena_pedido UNIQUE (id_pedido)
);
GO
CREATE INDEX idx_resena_score ON DIM_RESENA(puntuacion_review);
CREATE INDEX idx_resena_satisfaccion ON DIM_RESENA(satisfaccion);
GO

-- ----------------------------------------------------------------------------
-- FACT_VENTAS — grano: ítem vendido
-- ----------------------------------------------------------------------------
CREATE TABLE FACT_VENTAS (
    id_item_venta       INT           IDENTITY(1,1) PRIMARY KEY,
    id_pedido           VARCHAR(50)   NOT NULL,                -- degenerate dim
    estado_pedido       VARCHAR(20)   NOT NULL,                -- delivered / canceled / etc.
    id_cliente          VARCHAR(50)   NOT NULL,
    id_producto         VARCHAR(50)   NOT NULL,
    id_vendedor         VARCHAR(50)   NOT NULL,
    id_tiempo           INT           NOT NULL,                -- mapea fecha_compra
    id_pago             INT           NOT NULL,
    id_geografia_cli    INT           NOT NULL,
    id_geografia_ven    INT           NOT NULL,
    precio              DECIMAL(10,2) NOT NULL,
    flete               DECIMAL(10,2) NOT NULL,
    valor_total         DECIMAL(10,2) NOT NULL,
    flete_sobre_precio  DECIMAL(7,2),
    dias_hasta_entrega  INT,
    dias_retraso        INT,
    entrego_a_tiempo    BIT,
    FOREIGN KEY (id_cliente)       REFERENCES DIM_CLIENTE(id_cliente),
    FOREIGN KEY (id_producto)      REFERENCES DIM_PRODUCTO(id_producto),
    FOREIGN KEY (id_vendedor)      REFERENCES DIM_VENDEDOR(id_vendedor),
    FOREIGN KEY (id_tiempo)        REFERENCES DIM_TIEMPO(id_tiempo),
    FOREIGN KEY (id_pago)          REFERENCES DIM_PAGO(id_pago),
    FOREIGN KEY (id_geografia_cli) REFERENCES DIM_GEOGRAFIA(id_geografia),
    FOREIGN KEY (id_geografia_ven) REFERENCES DIM_GEOGRAFIA(id_geografia)
);
GO

CREATE NONCLUSTERED INDEX idx_fact_pedido    ON FACT_VENTAS(id_pedido);
CREATE NONCLUSTERED INDEX idx_fact_tiempo    ON FACT_VENTAS(id_tiempo);
CREATE NONCLUSTERED INDEX idx_fact_producto  ON FACT_VENTAS(id_producto);
CREATE NONCLUSTERED INDEX idx_fact_vendedor  ON FACT_VENTAS(id_vendedor);
CREATE NONCLUSTERED INDEX idx_fact_cliente   ON FACT_VENTAS(id_cliente);
CREATE NONCLUSTERED INDEX idx_fact_estado    ON FACT_VENTAS(estado_pedido);
GO
