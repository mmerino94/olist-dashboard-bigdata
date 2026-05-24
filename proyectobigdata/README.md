# Olist BI Executive Suite

Proyecto de inteligencia de negocios en Streamlit construido sobre el dataset **Brazilian E-Commerce Public Dataset by Olist**. La solución está enfocada en responder preguntas de gerencia sobre rentabilidad, recompra, entregas y desempeño de vendedores.

## Arquitectura general

- **Capa de datos**: archivos CSV originales del dataset Olist dentro de `data/`.
- **Capa ETL**: `src/data_loader.py` y `src/transform.py` cargan, validan, limpian, unen y enriquecen el modelo analítico.
- **Capa analítica**: `src/kpis.py` y `src/modelado.py` calculan indicadores y documentan el diseño de BI.
- **Capa visual**: `app.py`, `src/charts.py`, `src/styles.py` y `src/utils.py` construyen el dashboard ejecutivo.

## Estructura

```text
proyectobigdata/
├── app.py
├── requirements.txt
├── README.md
├── data/
│   ├── olist_customers_dataset.csv
│   ├── olist_orders_dataset.csv
│   ├── olist_order_items_dataset.csv
│   ├── olist_order_payments_dataset.csv
│   ├── olist_order_reviews_dataset.csv
│   ├── olist_products_dataset.csv
│   ├── olist_sellers_dataset.csv
│   ├── olist_geolocation_dataset.csv
│   └── product_category_name_translation.csv
└── src/
    ├── __init__.py
    ├── charts.py
    ├── data_loader.py
    ├── kpis.py
    ├── modelado.py
    ├── styles.py
    ├── transform.py
    └── utils.py
```

## KPIs incluidos

- Ingreso total
- Número total de pedidos
- Ticket promedio
- Ingreso y participación por categoría
- Tasa de recompra y clientes de una sola compra
- Tiempo promedio de entrega
- Porcentaje de entrega puntual
- Días promedio de retraso
- Satisfacción promedio
- Porcentaje de reseñas malas
- Porcentaje de pedidos con comentario
- Score de vendedor

## Variables derivadas incluidas

- `dias_hasta_entrega`
- `dias_retraso`
- `entrega_puntual`
- `valor_total_item`
- `valor_total_pedido`
- `flete_sobre_precio`
- `satisfaccion_cliente`
- `escribio_comentario`
- `rango_precio_producto`
- `ruta_logistica`
- `mes_compra`
- `trimestre_compra`
- `anio_compra`

## Cómo ejecutar

1. Crear un entorno virtual:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

2. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

3. Colocar los CSV originales en `data/`.

4. Ejecutar la app:

```powershell
streamlit run app.py
```

## Secciones de la app

- Inicio / Resumen Ejecutivo
- Ventas y Categorías
- Clientes y Retención
- Logística y Entregas
- Vendedores y Satisfacción
- Modelo de Datos
- Presentación / Avance

## Guion de exposición sugerido

1. El negocio ya tiene volumen suficiente para gobernarse por indicadores de servicio y rentabilidad, no solo por ventas.
2. La mayor oportunidad de crecimiento está en elevar recompra y estabilizar la experiencia post compra.
3. El desempeño de sellers y logística explica buena parte de las reseñas negativas.
4. El modelo analítico a nivel ítem permite priorizar categorías, rutas y vendedores con precisión operativa.

## Recomendaciones finales

- Priorizar inversión comercial en categorías líderes con buena experiencia operativa.
- Implementar campañas de segunda compra basadas en clientes de una sola orden.
- Crear SLA por seller con alertas preventivas y visibilidad condicionada a score.
- Usar las reseñas negativas como señal de causa raíz para logística, empaque y cumplimiento.
