from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from src.charts import (
    bar_metric_chart,
    category_bubble_chart,
    delivery_delay_vs_review_chart,
    heatmap_states_chart,
    line_revenue_chart,
    pareto_categories_chart,
    pie_repeat_customers_chart,
    rfm_segment_chart,
    review_word_frequency_chart,
    seller_ranking_chart,
)
from src.data_loader import DataLoadError, load_olist_data
from src.kpis import (
    build_executive_findings,
    build_executive_metrics,
    build_segment_recommendations,
    build_summary_kpis,
)
from src.modelado import (
    build_conceptual_model_graph,
    build_conceptual_model_markdown,
    build_logical_model_graph,
    build_logical_model_markdown,
    build_physical_model_graph,
    build_physical_sql,
)
from src.styles import apply_global_styles
from src.transform import (
    apply_filters,
    build_category_metrics,
    build_customer_segments,
    build_delivery_metrics,
    build_seller_metrics,
    build_text_review_terms,
    prepare_analytic_model,
)
from src.utils import (
    format_currency,
    format_number,
    format_pct,
    render_kpi_cards,
    render_recommendation_box,
    render_section_header,
    render_slide_block,
    render_slide_cover,
    render_team_members,
    render_status_message,
)


st.set_page_config(
    page_title="Olist BI Executive Suite",
    page_icon=":bar_chart:",
    layout="wide",
    initial_sidebar_state="expanded",
)
apply_global_styles()

DATA_DIR = Path(__file__).parent / "data"


@st.cache_data(show_spinner=False)
def get_model():
    raw = load_olist_data(DATA_DIR)
    return prepare_analytic_model(raw)


def sidebar_filters(model: dict) -> dict:
    fact = model["fact_sales"]
    st.sidebar.markdown("## Filtros")

    min_date = fact["order_purchase_timestamp"].min().date()
    max_date = fact["order_purchase_timestamp"].max().date()
    date_range = st.sidebar.date_input(
        "Periodo de compra",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date,
    )
    if not isinstance(date_range, tuple) or len(date_range) != 2:
        date_range = (min_date, max_date)

    states = sorted(x for x in fact["customer_state"].dropna().unique().tolist())
    categories = sorted(x for x in fact["category_name"].dropna().unique().tolist())

    selected_states = st.sidebar.multiselect("Estado destino", states, default=states)
    selected_categories = st.sidebar.multiselect(
        "Categoría",
        categories,
        default=categories[:12] if len(categories) > 12 else categories,
    )

    st.sidebar.markdown("---")
    st.sidebar.caption(
        "El modelo opera a nivel de ítem vendido. Los indicadores se recalculan con los filtros activos."
    )

    return {
        "date_range": date_range,
        "states": selected_states,
        "categories": selected_categories,
    }


def overview_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Resumen Ejecutivo",
        "Vista consolidada para dirección: crecimiento, calidad de servicio y focos de rentabilidad.",
    )
    metrics = build_summary_kpis(filtered_fact)
    render_kpi_cards(metrics)

    col1, col2 = st.columns((1.6, 1))
    with col1:
        st.plotly_chart(
            line_revenue_chart(filtered_fact, "Evolución mensual de ingresos"),
            use_container_width=True,
        )
    with col2:
        top_categories = (
            filtered_fact.groupby("category_name", as_index=False)["valor_total_item"]
            .sum()
            .sort_values("valor_total_item", ascending=False)
            .head(5)
        )
        st.plotly_chart(
            bar_metric_chart(
                top_categories,
                x="valor_total_item",
                y="category_name",
                title="Top 5 categorías por ingreso",
                orientation="h",
                color="#1D8348",
                x_title="Ingreso",
                y_title="Categoría",
                currency_axis=True,
            ),
            use_container_width=True,
        )

    findings, recommendations = build_executive_findings(filtered_fact)
    col3, col4 = st.columns(2)
    with col3:
        render_status_message("Hallazgos Clave", findings, tone="neutral")
    with col4:
        render_recommendation_box("Recomendaciones Ejecutivas", recommendations)


def sales_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Ventas y Categorías",
        "Identifica las categorías que impulsan ingresos, concentran riesgo y explican el principio de Pareto.",
    )
    category_metrics = build_category_metrics(filtered_fact)

    col1, col2 = st.columns((1.05, 1))
    with col1:
        st.plotly_chart(
            pareto_categories_chart(category_metrics),
            use_container_width=True,
        )
    with col2:
        st.plotly_chart(
            category_bubble_chart(category_metrics),
            use_container_width=True,
        )

    star_categories = category_metrics.nlargest(3, "ingreso_total")[
        ["category_name", "ingreso_total", "porcentaje_retraso", "porcentaje_resenas_malas"]
    ]
    problem_categories = category_metrics.sort_values(
        ["porcentaje_resenas_malas", "porcentaje_retraso", "ingreso_total"],
        ascending=[False, False, False],
    ).head(3)[["category_name", "porcentaje_resenas_malas", "porcentaje_retraso", "ticket_promedio"]]

    col3, col4 = st.columns(2)
    with col3:
        st.subheader("Categorías estrella")
        st.dataframe(
            star_categories.assign(
                ingreso_total=star_categories["ingreso_total"].map(format_currency),
                porcentaje_retraso=star_categories["porcentaje_retraso"].map(format_pct),
                porcentaje_resenas_malas=star_categories["porcentaje_resenas_malas"].map(format_pct),
            ),
            use_container_width=True,
            hide_index=True,
        )
    with col4:
        st.subheader("Categorías problema")
        st.dataframe(
            problem_categories.assign(
                porcentaje_resenas_malas=problem_categories["porcentaje_resenas_malas"].map(format_pct),
                porcentaje_retraso=problem_categories["porcentaje_retraso"].map(format_pct),
                ticket_promedio=problem_categories["ticket_promedio"].map(format_currency),
            ),
            use_container_width=True,
            hide_index=True,
        )


def customers_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Clientes y Retención",
        "La recompra se mide sobre cliente único real y se segmenta con lógica RFM orientada a negocio.",
    )
    customer_segments = build_customer_segments(filtered_fact)

    col1, col2 = st.columns((0.9, 1.1))
    with col1:
        st.plotly_chart(
            pie_repeat_customers_chart(customer_segments),
            use_container_width=True,
        )
    with col2:
        st.plotly_chart(
            rfm_segment_chart(customer_segments),
            use_container_width=True,
        )

    table = customer_segments.groupby("segmento", as_index=False).agg(
        clientes=("customer_unique_id", "nunique"),
        ingreso=("monetary_value", "sum"),
        satisfaccion_promedio=("review_score_mean", "mean"),
    ).sort_values("ingreso", ascending=False)
    table["recomendacion"] = table["segmento"].map(build_segment_recommendations())

    st.dataframe(
        table.assign(
            ingreso=table["ingreso"].map(format_currency),
            satisfaccion_promedio=table["satisfaccion_promedio"].round(2),
        ),
        use_container_width=True,
        hide_index=True,
    )


def logistics_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Logística y Entregas",
        "Monitorea puntualidad, rutas problemáticas y el efecto del retraso sobre la satisfacción del cliente.",
    )
    delivery_metrics = build_delivery_metrics(filtered_fact)
    render_kpi_cards(build_executive_metrics(delivery_metrics))

    col1, col2 = st.columns((1, 1))
    with col1:
        st.plotly_chart(
            delivery_delay_vs_review_chart(filtered_fact),
            use_container_width=True,
        )
    with col2:
        st.plotly_chart(
            heatmap_states_chart(delivery_metrics),
            use_container_width=True,
        )

    top_routes = delivery_metrics.sort_values(
        ["porcentaje_retraso", "ordenes"], ascending=[False, False]
    ).head(10)[["ruta_logistica", "ordenes", "porcentaje_retraso", "dias_retraso_promedio"]]
    st.subheader("Top rutas problemáticas")
    st.dataframe(
        top_routes.assign(
            ordenes=top_routes["ordenes"].map(format_number),
            porcentaje_retraso=top_routes["porcentaje_retraso"].map(format_pct),
            dias_retraso_promedio=top_routes["dias_retraso_promedio"].round(1),
        ),
        use_container_width=True,
        hide_index=True,
    )

    render_recommendation_box(
        "Recomendaciones Operativas",
        [
            "Priorizar acuerdos logísticos en rutas con alto ingreso y atraso recurrente.",
            "Aplicar alertas preventivas a pedidos con SLA comprometido antes de la fecha estimada.",
            "Usar la puntualidad como variable de score operativo para vendedores y transportistas.",
        ],
    )


def sellers_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Vendedores y Satisfacción",
        "Se clasifica a los sellers según su impacto simultáneo en ingresos, puntualidad y experiencia del cliente.",
    )
    seller_metrics = build_seller_metrics(filtered_fact)
    review_terms = build_text_review_terms(filtered_fact)

    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(
            seller_ranking_chart(seller_metrics.head(10), "Top 10 mejores vendedores"),
            use_container_width=True,
        )
    with col2:
        worst = seller_metrics.sort_values("score_vendedor", ascending=True).head(10)
        st.plotly_chart(
            seller_ranking_chart(worst, "Top 10 vendedores críticos"),
            use_container_width=True,
        )

    st.plotly_chart(
        review_word_frequency_chart(review_terms),
        use_container_width=True,
    )

    critical_share = seller_metrics.loc[
        seller_metrics["clasificacion_vendedor"] == "Crítico", "participacion_ingreso"
    ].sum()
    render_status_message(
        "Lectura Gerencial",
        [
            f"Los vendedores clasificados como críticos concentran {format_pct(critical_share)} del ingreso filtrado.",
            "Esto implica riesgo reputacional y financiero: el foco no es solo la satisfacción, también la exposición comercial.",
            "Conviene combinar planes correctivos con reglas de visibilidad y SLA mínimos por seller.",
        ],
        tone="warning" if critical_share > 0.15 else "neutral",
    )


def model_page():
    render_section_header(
        "Modelo de Datos",
        "Diseño analítico con tabla de hechos a nivel de ítem vendido y dimensiones orientadas a BI ejecutivo.",
    )
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(build_conceptual_model_markdown())
    with col2:
        st.markdown(build_logical_model_markdown())

    with st.expander("SQL físico sugerido"):
        st.code(build_physical_sql(), language="sql")


def presentation_page(filtered_fact: pd.DataFrame):
    render_section_header(
        "Presentación / Avance",
        "Secuencia tipo presentación ejecutiva para exponer KPI, modelo conceptual/lógico y modelo físico.",
    )
    metrics = build_summary_kpis(filtered_fact)
    findings, recommendations = build_executive_findings(filtered_fact)
    delivery_metrics = build_delivery_metrics(filtered_fact)

    total_revenue = filtered_fact["valor_total_item"].sum()
    total_orders = filtered_fact["order_id"].nunique()
    avg_delay = filtered_fact["dias_retraso"].mean()
    bad_review_rate = filtered_fact["porcentaje_review_mala_flag"].mean()

    slide0, slide1, slide2, slide3, slide4 = st.tabs(
        [
            "Slide 0 · Portada",
            "Slide 1 · KPI",
            "Slide 2 · Conceptual y Lógico",
            "Slide 3 · Físico",
            "Slide 4 · Cierre",
        ]
    )

    with slide0:
        render_slide_cover(
            "Olist BI Executive Suite",
            "Propuesta analítica para dirección enfocada en ingresos, recompra, puntualidad y reputación operativa.",
            "Presentación ejecutiva",
            [
                "Problema 1: qué genera dinero y qué lo destruye",
                "Problema 2: clientes que compran una vez y no regresan",
                "Problema 3: retrasos logísticos que afectan satisfacción",
                "Problema 4: vendedores con impacto negativo en la plataforma",
                "Problema 5: causas de la insatisfacción del cliente",
                "Entregable: dashboard y modelo analítico listo para gerencia",
            ],
        )
        render_team_members(
            [
                "Rios Chiuca Jaime Arturo",
                "Huaman Llanos Felix Moises",
                "Montes Quispe Adrian Guido",
                "Merino Huaman Manuel",
            ]
        )
        col1, col2, col3 = st.columns(3)
        with col1:
            render_slide_block(
                "Objetivo",
                "Qué resuelve",
                "Concentrar en una sola solución la lectura de ventas, servicio, sellers y experiencia del cliente.",
                tone="success",
            )
        with col2:
            render_slide_block(
                "Enfoque",
                "Cómo se construyó",
                "Modelo a nivel de ítem vendido para explicar rentabilidad, puntualidad y satisfacción con precisión operativa.",
                tone="neutral",
            )
        with col3:
            render_slide_block(
                "Valor para gerencia",
                "Por qué importa",
                "La plataforma deja de reaccionar por intuición y empieza a priorizar categorías, rutas y vendedores con evidencia.",
                tone="warning",
            )
        st.plotly_chart(
            line_revenue_chart(filtered_fact, "Panorama de ingresos del proyecto"),
            use_container_width=True,
        )

    with slide1:
        st.markdown("### KPI ejecutivos para exposición")
        render_kpi_cards(metrics)
        st.markdown(
            f"""
            <div class="slide-chip-row">
                <div class="slide-chip">
                    <div class="slide-chip-label">Ingreso analizado</div>
                    <div class="slide-chip-value">{format_currency(total_revenue)}</div>
                </div>
                <div class="slide-chip">
                    <div class="slide-chip-label">Pedidos cubiertos</div>
                    <div class="slide-chip-value">{format_number(total_orders)}</div>
                </div>
                <div class="slide-chip">
                    <div class="slide-chip-label">Retraso promedio</div>
                    <div class="slide-chip-value">{avg_delay:.1f} días</div>
                </div>
                <div class="slide-chip">
                    <div class="slide-chip-label">Reseña mala</div>
                    <div class="slide-chip-value">{format_pct(bad_review_rate)}</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        col1, col2 = st.columns((1.1, 0.9))
        with col1:
            st.plotly_chart(
                line_revenue_chart(filtered_fact, "Evolución mensual de ingresos"),
                use_container_width=True,
            )
        with col2:
            top_categories = (
                filtered_fact.groupby("category_name", as_index=False)["valor_total_item"]
                .sum()
                .sort_values("valor_total_item", ascending=False)
                .head(5)
            )
            st.plotly_chart(
                bar_metric_chart(
                    top_categories,
                    x="valor_total_item",
                    y="category_name",
                    title="Categorías líderes por ingreso",
                    orientation="h",
                    color="#1D8348",
                    x_title="Ingreso",
                    y_title="Categoría",
                    currency_axis=True,
                ),
                use_container_width=True,
            )
        col3, col4 = st.columns(2)
        with col3:
            render_status_message("Lectura gerencial del slide", findings, tone="neutral")
        with col4:
            render_slide_block(
                "Qué demuestran estos KPI",
                "Interpretación ejecutiva",
                "El negocio ya tiene masa crítica comercial. El problema no es solamente vender más, sino proteger ingreso con mejor servicio, puntualidad y retención.",
                tone="success",
            )

    with slide2:
        st.markdown("### Modelo conceptual y lógico")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(
                """
                <div class="model-preview">
                    <div class="model-preview-title">Modelo conceptual</div>
                    <div class="model-preview-text">
                        Vista de negocio centrada en <b>Fact_Ventas</b> y sus dimensiones de cliente, producto, vendedor, tiempo, pago y review.
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            with st.popover("Abrir diagrama conceptual", use_container_width=True):
                st.graphviz_chart(build_conceptual_model_graph(), use_container_width=True)
        with col2:
            st.markdown(
                """
                <div class="model-preview">
                    <div class="model-preview-title">Modelo lógico</div>
                    <div class="model-preview-text">
                        Muestra las tablas fuente y los joins principales que construyen la tabla analítica a nivel de ítem vendido.
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            with st.popover("Abrir diagrama lógico", use_container_width=True):
                st.graphviz_chart(build_logical_model_graph(), use_container_width=True)

        col3, col4 = st.columns(2)
        with col3:
            render_slide_block(
                "Modelo conceptual",
                "Vista de negocio",
                "Fact_Ventas es el núcleo. A su alrededor se organizan cliente, producto, vendedor, pago, tiempo y review para responder preguntas gerenciales desde una estructura clara.",
                tone="success",
            )
            st.markdown(build_conceptual_model_markdown())
        with col4:
            render_slide_block(
                "Modelo lógico",
                "Vista analítica",
                "La decisión de trabajar a nivel de ítem vendido permite leer categoría, seller, freight y experiencia sin distorsionar indicadores del pedido.",
                tone="neutral",
            )
            st.markdown(build_logical_model_markdown())

    with slide3:
        st.markdown("### Modelo físico propuesto")
        col1, col2 = st.columns((1.05, 0.95))
        with col1:
            st.markdown(
                """
                <div class="model-preview">
                    <div class="model-preview-title">Modelo físico</div>
                    <div class="model-preview-text">
                        Estructura sugerida para data mart con dimensiones separadas y una tabla de hechos central lista para SQL Server.
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            with st.popover("Abrir diagrama físico", use_container_width=True):
                st.graphviz_chart(build_physical_model_graph(), use_container_width=True)
            punctuality = delivery_metrics["puntualidad"].mean() if not delivery_metrics.empty else 0
            render_slide_block(
                "Listo para implementación",
                "Data mart",
                f"El diseño físico separa dimensiones y hechos de forma compatible con SQL Server. Con una puntualidad promedio de {format_pct(punctuality)}, la capa física ya puede soportar tableros, vistas y seguimiento por SLA.",
                tone="success",
            )
        with col2:
            render_slide_block(
                "Qué ve el docente aquí",
                "Lectura técnica",
                "Se visualiza una tabla de hechos central conectada con dimensiones empresariales. Eso demuestra modelado BI real, no solo limpieza de CSV ni gráficos sueltos.",
                tone="warning",
            )
            st.code(build_physical_sql(), language="sql")

    with slide4:
        render_slide_cover(
            "Conclusiones y siguientes decisiones",
            "La solución deja una base concreta para intervenir categorías, clientes, logística y sellers con una misma lógica analítica.",
            "Cierre ejecutivo",
            recommendations,
        )
        col1, col2 = st.columns((1, 1))
        with col1:
            st.plotly_chart(
                category_bubble_chart(build_category_metrics(filtered_fact)),
                use_container_width=True,
            )
        with col2:
            render_slide_block(
                "Hallazgo final",
                "Síntesis",
                "El negocio tiene escala comercial, pero su margen de mejora está en retención, puntualidad y disciplina operativa de sellers.",
                tone="success",
            )
            render_slide_block(
                "Próximo paso sugerido",
                "Maduración",
                "Migrar el modelo a SQL Server y conectar el dashboard a una capa persistente para seguimiento continuo y no solo analítico.",
                tone="neutral",
            )


def main():
    st.sidebar.title("Olist BI Executive Suite")
    st.sidebar.caption("Panel ejecutivo para ventas, retención, logística y calidad.")

    try:
        model = get_model()
    except DataLoadError as exc:
        st.error(str(exc))
        st.info(
            "Coloca los CSV originales de Olist dentro de la carpeta `data/` para activar el modelo."
        )
        return

    filters = sidebar_filters(model)
    filtered_fact = apply_filters(model["fact_sales"], filters)

    pages = {
        "Inicio / Resumen Ejecutivo": lambda: overview_page(filtered_fact),
        "Ventas y Categorías": lambda: sales_page(filtered_fact),
        "Clientes y Retención": lambda: customers_page(filtered_fact),
        "Logística y Entregas": lambda: logistics_page(filtered_fact),
        "Vendedores y Satisfacción": lambda: sellers_page(filtered_fact),
        "Modelo de Datos": model_page,
        "Presentación / Avance": lambda: presentation_page(filtered_fact),
    }

    selected_page = st.sidebar.radio("Navegación", list(pages.keys()))
    pages[selected_page]()


if __name__ == "__main__":
    main()
