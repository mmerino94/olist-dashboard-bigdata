from __future__ import annotations


def build_conceptual_model_markdown() -> str:
    return """
### Modelo conceptual

**Objetivo**
Analizar rentabilidad, retención, logística y reputación comercial desde una sola capa analítica.

**Entidad central**
- `Fact_Ventas`: una fila por ítem vendido.

**Dimensiones principales**
- `Dim_Cliente`
- `Dim_Producto`
- `Dim_Vendedor`
- `Dim_Pago`
- `Dim_Review`
- `Dim_Tiempo`
- `Dim_Categoria_Traducida`
- `Dim_Geolocalizacion` opcional para origen y destino

**Justificación**
El grano a nivel ítem permite ver categorías, sellers y flete con precisión sin perder la visión del pedido completo.
"""


def build_logical_model_markdown() -> str:
    return """
### Modelo lógico

**Fact_Ventas**
- Claves de negocio: `order_id`, `order_item_id`, `product_id`, `seller_id`, `customer_id`
- Métricas: `price`, `freight_value`, `valor_total_item`, `valor_total_pedido`
- Servicio: `dias_hasta_entrega`, `dias_retraso`, `entrega_puntual`
- Experiencia: `review_score`, `satisfaccion_cliente`, `escribio_comentario`
- Tiempo: `mes_compra`, `trimestre_compra`, `anio_compra`
- Ruta: `ruta_logistica`

**Relaciones**
- `orders.customer_id = customers.customer_id`
- `order_items.order_id = orders.order_id`
- `order_items.product_id = products.product_id`
- `order_items.seller_id = sellers.seller_id`
- `order_reviews.order_id = orders.order_id`
- `order_payments.order_id = orders.order_id`
- `products.product_category_name = product_category_name_translation.product_category_name`

**Enfoque**
Esquema estrella híbrido: la tabla de hechos se apoya en dimensiones limpias y algunas columnas derivadas quedan denormalizadas para acelerar análisis ejecutivo.
"""


def build_physical_sql() -> str:
    return """
CREATE TABLE Dim_Cliente (
    customer_id VARCHAR(50) PRIMARY KEY,
    customer_unique_id VARCHAR(50),
    customer_zip_code_prefix INT,
    customer_city VARCHAR(100),
    customer_state CHAR(2)
);

CREATE TABLE Dim_Producto (
    product_id VARCHAR(50) PRIMARY KEY,
    product_category_name VARCHAR(120),
    product_category_name_english VARCHAR(120),
    product_weight_g FLOAT,
    product_length_cm FLOAT,
    product_height_cm FLOAT,
    product_width_cm FLOAT
);

CREATE TABLE Dim_Vendedor (
    seller_id VARCHAR(50) PRIMARY KEY,
    seller_zip_code_prefix INT,
    seller_city VARCHAR(100),
    seller_state CHAR(2)
);

CREATE TABLE Dim_Pago (
    order_id VARCHAR(50) PRIMARY KEY,
    payment_type VARCHAR(30),
    payment_installments INT,
    payment_value DECIMAL(18,2)
);

CREATE TABLE Dim_Review (
    order_id VARCHAR(50) PRIMARY KEY,
    review_score INT,
    review_comment_title VARCHAR(255),
    review_comment_message VARCHAR(MAX),
    review_creation_date DATETIME,
    review_answer_timestamp DATETIME
);

CREATE TABLE Fact_Ventas (
    order_id VARCHAR(50) NOT NULL,
    order_item_id INT NOT NULL,
    product_id VARCHAR(50),
    seller_id VARCHAR(50),
    customer_id VARCHAR(50),
    order_purchase_timestamp DATETIME,
    order_estimated_delivery_date DATETIME,
    order_delivered_customer_date DATETIME,
    price DECIMAL(18,2),
    freight_value DECIMAL(18,2),
    valor_total_item DECIMAL(18,2),
    valor_total_pedido DECIMAL(18,2),
    dias_hasta_entrega INT,
    dias_retraso INT,
    entrega_puntual BIT,
    satisfaccion_cliente VARCHAR(20),
    escribio_comentario BIT,
    rango_precio_producto VARCHAR(20),
    ruta_logistica VARCHAR(20),
    mes_compra VARCHAR(7),
    trimestre_compra VARCHAR(8),
    anio_compra INT,
    CONSTRAINT PK_Fact_Ventas PRIMARY KEY (order_id, order_item_id)
);
"""


def build_conceptual_model_graph() -> str:
    return r"""
digraph Conceptual {
    graph [pad="0.3", nodesep="0.65", ranksep="1.0", bgcolor="transparent", splines=ortho]
    node [shape=plain, fontname="Segoe UI"]
    edge [color="#7F8C8D", penwidth=1.6, arrowsize=0.8]

    Fact [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="10" COLOR="#17202A" BGCOLOR="#17202A">
      <TR><TD><FONT COLOR="white" POINT-SIZE="18"><B>Fact_Ventas</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#D5DBDB" POINT-SIZE="11">Grano: 1 fila = 1 ítem vendido</FONT></TD></TR>
    </TABLE>>]

    Cliente [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>Dim_Cliente</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#145A32" POINT-SIZE="10">perfil, ciudad, estado</FONT></TD></TR>
    </TABLE>>]

    Producto [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>Dim_Producto</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#145A32" POINT-SIZE="10">atributos, categoría</FONT></TD></TR>
    </TABLE>>]

    Vendedor [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>Dim_Vendedor</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#145A32" POINT-SIZE="10">seller, ubicación origen</FONT></TD></TR>
    </TABLE>>]

    Tiempo [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#5D6D7E" BGCOLOR="#F4F6F7">
      <TR><TD><FONT COLOR="#34495E"><B>Dim_Tiempo</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#34495E" POINT-SIZE="10">día, mes, trimestre, año</FONT></TD></TR>
    </TABLE>>]

    Pago [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#B7950B" BGCOLOR="#FEF5E7">
      <TR><TD><FONT COLOR="#7D6608"><B>Dim_Pago</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#7D6608" POINT-SIZE="10">tipo y valor de pago</FONT></TD></TR>
    </TABLE>>]

    Review [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#C0392B" BGCOLOR="#FDEDEC">
      <TR><TD><FONT COLOR="#922B21"><B>Dim_Review</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#922B21" POINT-SIZE="10">score y comentario</FONT></TD></TR>
    </TABLE>>]

    Categoria [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#2874A6" BGCOLOR="#EBF5FB">
      <TR><TD><FONT COLOR="#1B4F72"><B>Dim_Categoria_Traducida</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#1B4F72" POINT-SIZE="10">categoría negocio</FONT></TD></TR>
    </TABLE>>]

    Geo [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="9" COLOR="#7D3C98" BGCOLOR="#F5EEF8">
      <TR><TD><FONT COLOR="#6C3483"><B>Dim_Geolocalizacion</B></FONT></TD></TR>
      <TR><TD><FONT COLOR="#6C3483" POINT-SIZE="10">origen y destino</FONT></TD></TR>
    </TABLE>>]

    {rank=same; Cliente Producto Vendedor}
    {rank=same; Tiempo Review Pago Categoria Geo}

    Fact -> Cliente [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Producto [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Vendedor [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Tiempo [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Pago [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Review [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Categoria [dir=both, arrowhead=none, arrowtail=none]
    Fact -> Geo [dir=both, arrowhead=none, arrowtail=none]
}
"""


def build_logical_model_graph() -> str:
    return r"""
digraph Logical {
    graph [pad="0.3", nodesep="0.5", ranksep="0.9", bgcolor="transparent", splines=ortho]
    node [shape=plain, fontname="Consolas"]
    edge [color="#7F8C8D", penwidth=1.4, arrowsize=0.7]

    Orders [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>olist_orders_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">PK order_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">FK customer_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">timestamps, status</FONT></TD></TR>
    </TABLE>>]

    Customers [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#2874A6" BGCOLOR="#EBF5FB">
      <TR><TD><FONT COLOR="#1B4F72"><B>olist_customers_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">PK customer_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">customer_unique_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">city, state, zip</FONT></TD></TR>
    </TABLE>>]

    Items [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#17202A" BGCOLOR="#17202A">
      <TR><TD><FONT COLOR="white"><B>Fact_Ventas / order_items</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT COLOR="#D5DBDB" POINT-SIZE="10">PK order_id + order_item_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT COLOR="#D5DBDB" POINT-SIZE="10">FK product_id, seller_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT COLOR="#D5DBDB" POINT-SIZE="10">price, freight, valor_total_item</FONT></TD></TR>
    </TABLE>>]

    Products [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>olist_products_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">PK product_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">category_name</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">weight, dimensions</FONT></TD></TR>
    </TABLE>>]

    Sellers [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#1D8348" BGCOLOR="#EAF7EF">
      <TR><TD><FONT COLOR="#145A32"><B>olist_sellers_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">PK seller_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">city, state, zip</FONT></TD></TR>
    </TABLE>>]

    Payments [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#B7950B" BGCOLOR="#FEF5E7">
      <TR><TD><FONT COLOR="#7D6608"><B>olist_order_payments_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">FK order_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">payment_type</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">payment_value</FONT></TD></TR>
    </TABLE>>]

    Reviews [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#C0392B" BGCOLOR="#FDEDEC">
      <TR><TD><FONT COLOR="#922B21"><B>olist_order_reviews_dataset</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">FK order_id</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">review_score</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">comment_message</FONT></TD></TR>
    </TABLE>>]

    Translation [label=<
    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="8" COLOR="#5D6D7E" BGCOLOR="#F4F6F7">
      <TR><TD><FONT COLOR="#34495E"><B>product_category_translation</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">product_category_name</FONT></TD></TR>
      <TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">product_category_name_english</FONT></TD></TR>
    </TABLE>>]

    {rank=same; Orders Items Products Sellers}
    {rank=same; Customers Payments Reviews Translation}

    Orders -> Items [label=" order_id "]
    Customers -> Orders [label=" customer_id "]
    Products -> Items [label=" product_id "]
    Sellers -> Items [label=" seller_id "]
    Payments -> Orders [label=" order_id "]
    Reviews -> Orders [label=" order_id "]
    Translation -> Products [label=" category_name "]
}
"""


def build_physical_model_graph() -> str:
    return r"""
digraph Physical {
    graph [pad="0.3", nodesep="0.55", ranksep="0.9", bgcolor="transparent", splines=ortho]
    node [shape=plain, fontname="Consolas"]
    edge [color="#7F8C8D", penwidth=1.4, arrowsize=0.7]

    DimCliente [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#2874A6">
      <TR><TD BGCOLOR="#2874A6"><FONT COLOR="white"><B>Dim_Cliente</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK customer_id</TD></TR>
      <TR><TD ALIGN="LEFT">customer_unique_id</TD></TR>
      <TR><TD ALIGN="LEFT">customer_city</TD></TR>
      <TR><TD ALIGN="LEFT">customer_state</TD></TR>
    </TABLE>>]

    DimProducto [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#1D8348">
      <TR><TD BGCOLOR="#1D8348"><FONT COLOR="white"><B>Dim_Producto</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK product_id</TD></TR>
      <TR><TD ALIGN="LEFT">product_category_name</TD></TR>
      <TR><TD ALIGN="LEFT">product_weight_g</TD></TR>
      <TR><TD ALIGN="LEFT">product_length_cm</TD></TR>
    </TABLE>>]

    DimVendedor [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#1D8348">
      <TR><TD BGCOLOR="#1D8348"><FONT COLOR="white"><B>Dim_Vendedor</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK seller_id</TD></TR>
      <TR><TD ALIGN="LEFT">seller_city</TD></TR>
      <TR><TD ALIGN="LEFT">seller_state</TD></TR>
    </TABLE>>]

    DimPago [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#B7950B">
      <TR><TD BGCOLOR="#B7950B"><FONT COLOR="white"><B>Dim_Pago</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK order_id</TD></TR>
      <TR><TD ALIGN="LEFT">payment_type</TD></TR>
      <TR><TD ALIGN="LEFT">payment_installments</TD></TR>
      <TR><TD ALIGN="LEFT">payment_value</TD></TR>
    </TABLE>>]

    DimReview [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#C0392B">
      <TR><TD BGCOLOR="#C0392B"><FONT COLOR="white"><B>Dim_Review</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK order_id</TD></TR>
      <TR><TD ALIGN="LEFT">review_score</TD></TR>
      <TR><TD ALIGN="LEFT">review_comment_message</TD></TR>
    </TABLE>>]

    DimTiempo [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#5D6D7E">
      <TR><TD BGCOLOR="#5D6D7E"><FONT COLOR="white"><B>Dim_Tiempo</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK fecha</TD></TR>
      <TR><TD ALIGN="LEFT">mes_compra</TD></TR>
      <TR><TD ALIGN="LEFT">trimestre_compra</TD></TR>
      <TR><TD ALIGN="LEFT">anio_compra</TD></TR>
    </TABLE>>]

    FactVentas [label=<
    <TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#17202A">
      <TR><TD BGCOLOR="#17202A"><FONT COLOR="white"><B>Fact_Ventas</B></FONT></TD></TR>
      <TR><TD ALIGN="LEFT">PK order_id + order_item_id</TD></TR>
      <TR><TD ALIGN="LEFT">FK product_id, seller_id, customer_id</TD></TR>
      <TR><TD ALIGN="LEFT">price, freight_value</TD></TR>
      <TR><TD ALIGN="LEFT">valor_total_item, valor_total_pedido</TD></TR>
      <TR><TD ALIGN="LEFT">dias_hasta_entrega, dias_retraso</TD></TR>
      <TR><TD ALIGN="LEFT">entrega_puntual, satisfaccion_cliente</TD></TR>
    </TABLE>>]

    {rank=same; DimCliente DimProducto DimVendedor DimPago}
    {rank=same; DimReview DimTiempo FactVentas}

    DimCliente -> FactVentas
    DimProducto -> FactVentas
    DimVendedor -> FactVentas
    DimPago -> FactVentas
    DimReview -> FactVentas
    DimTiempo -> FactVentas
}
"""
