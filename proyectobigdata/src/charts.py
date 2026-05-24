from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


COLOR_GREEN = "#1D8348"
COLOR_RED = "#C0392B"
COLOR_GRAY = "#5D6D7E"
COLOR_GOLD = "#B7950B"


def _base_layout(fig: go.Figure) -> go.Figure:
    fig.update_layout(
        paper_bgcolor="white",
        plot_bgcolor="white",
        margin=dict(l=20, r=20, t=60, b=20),
        font=dict(family="Segoe UI", size=13, color="#17202A"),
        title=dict(font=dict(size=18)),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=1, xanchor="right"),
    )
    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(gridcolor="#EAECEE")
    return fig


def line_revenue_chart(fact: pd.DataFrame, title: str) -> go.Figure:
    monthly = fact.groupby("mes_compra", as_index=False)["valor_total_item"].sum()
    fig = px.line(monthly, x="mes_compra", y="valor_total_item", markers=True, title=title)
    fig.update_traces(line_color=COLOR_GREEN, marker_color=COLOR_GOLD, line_width=3)
    fig.update_yaxes(title="Ingreso")
    fig.update_xaxes(title="Mes")
    return _base_layout(fig)


def bar_metric_chart(
    data: pd.DataFrame,
    x: str,
    y: str,
    title: str,
    orientation: str = "v",
    color: str = COLOR_GREEN,
    x_title: str | None = None,
    y_title: str | None = None,
    currency_axis: bool = False,
) -> go.Figure:
    fig = px.bar(data, x=x, y=y, orientation=orientation, title=title, text_auto=".2s")
    fig.update_traces(marker_color=color)
    if currency_axis:
        axis_name = "xaxis" if orientation == "h" else "yaxis"
        fig.update_layout({axis_name: {"tickprefix": "R$ "}})
    fig.update_xaxes(title=x_title)
    fig.update_yaxes(title=y_title)
    return _base_layout(fig)


def pareto_categories_chart(category_metrics: pd.DataFrame) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=category_metrics["category_name"],
            y=category_metrics["ingreso_total"],
            name="Ingreso",
            marker_color=COLOR_GREEN,
        )
    )
    fig.add_trace(
        go.Scatter(
            x=category_metrics["category_name"],
            y=category_metrics["participacion_acumulada"] * 100,
            name="% acumulado",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color=COLOR_RED, width=3),
        )
    )
    fig.update_layout(
        title="Pareto 80/20 por categoría",
        yaxis=dict(title="Ingreso"),
        yaxis2=dict(title="% acumulado", overlaying="y", side="right", range=[0, 110]),
    )
    return _base_layout(fig)


def category_bubble_chart(category_metrics: pd.DataFrame) -> go.Figure:
    fig = px.scatter(
        category_metrics,
        x="ticket_promedio",
        y="porcentaje_resenas_malas",
        size="ingreso_total",
        color="porcentaje_retraso",
        hover_name="category_name",
        title="Ingreso, ticket, reseñas malas y retrasos por categoría",
        color_continuous_scale=["#1D8348", "#F4D03F", "#C0392B"],
    )
    fig.update_xaxes(title="Ticket promedio")
    fig.update_yaxes(title="% reseñas malas", tickformat=".0%")
    return _base_layout(fig)


def pie_repeat_customers_chart(customer_segments: pd.DataFrame) -> go.Figure:
    summary = customer_segments.groupby("one_time_customer", as_index=False).agg(
        clientes=("customer_unique_id", "nunique")
    )
    fig = px.pie(
        summary,
        names="one_time_customer",
        values="clientes",
        title="Clientes de una compra vs recurrentes",
        color="one_time_customer",
        color_discrete_map={"Una sola compra": COLOR_RED, "Recurrente": COLOR_GREEN},
    )
    return _base_layout(fig)


def rfm_segment_chart(customer_segments: pd.DataFrame) -> go.Figure:
    summary = customer_segments.groupby("segmento", as_index=False).agg(
        clientes=("customer_unique_id", "nunique"),
        ingreso=("monetary_value", "sum"),
    )
    fig = px.bar(
        summary.sort_values("ingreso", ascending=False),
        x="segmento",
        y="ingreso",
        color="segmento",
        title="Ingreso por segmento RFM",
        text_auto=".2s",
    )
    return _base_layout(fig)


def delivery_delay_vs_review_chart(fact: pd.DataFrame) -> go.Figure:
    sample = fact[["dias_retraso", "review_score", "valor_total_item"]].dropna()
    fig = px.scatter(
        sample,
        x="dias_retraso",
        y="review_score",
        size="valor_total_item",
        title="Relación entre retraso y satisfacción",
        opacity=0.55,
        color="review_score",
        color_continuous_scale=["#C0392B", "#F1C40F", "#1D8348"],
    )
    fig.update_xaxes(title="Días de retraso")
    fig.update_yaxes(title="Review score")
    return _base_layout(fig)


def heatmap_states_chart(delivery_metrics: pd.DataFrame) -> go.Figure:
    pivot = delivery_metrics.pivot_table(
        index="seller_state",
        columns="customer_state",
        values="porcentaje_retraso",
        aggfunc="mean",
    )
    fig = px.imshow(
        pivot,
        aspect="auto",
        color_continuous_scale=["#1D8348", "#F4D03F", "#C0392B"],
        title="Mapa de calor de retraso por origen y destino",
    )
    return _base_layout(fig)


def seller_ranking_chart(seller_metrics: pd.DataFrame, title: str) -> go.Figure:
    fig = px.bar(
        seller_metrics.sort_values("score_vendedor"),
        x="score_vendedor",
        y="seller_id",
        orientation="h",
        color="clasificacion_vendedor",
        title=title,
        text_auto=".1f",
        color_discrete_map={
            "Elite": COLOR_GREEN,
            "Estándar": COLOR_GOLD,
            "En observación": "#DC7633",
            "Crítico": COLOR_RED,
        },
    )
    fig.update_xaxes(title="Score vendedor")
    fig.update_yaxes(title="Seller ID")
    return _base_layout(fig)


def review_word_frequency_chart(review_terms: pd.DataFrame) -> go.Figure:
    fig = px.bar(
        review_terms.sort_values("frecuencia"),
        x="frecuencia",
        y="termino",
        orientation="h",
        title="Términos frecuentes en reseñas negativas",
        color_discrete_sequence=[COLOR_GRAY],
    )
    fig.update_xaxes(title="Frecuencia")
    fig.update_yaxes(title="Término")
    return _base_layout(fig)


def conceptual_model_diagram() -> go.Figure:
    fig = go.Figure()
    fig.update_layout(
        title="Modelo conceptual tipo arquitectura BI",
        paper_bgcolor="white",
        plot_bgcolor="white",
        margin=dict(l=10, r=10, t=60, b=10),
        xaxis=dict(visible=False, range=[0, 100]),
        yaxis=dict(visible=False, range=[0, 100]),
        height=620,
        shapes=[
            dict(type="rect", x0=4, y0=10, x1=96, y1=90, fillcolor="#F7F9FA", line=dict(color="#E5E8E8", width=1), layer="below"),
            dict(type="rect", x0=35, y0=37, x1=65, y1=63, fillcolor="#17202A", line=dict(color="#17202A", width=2)),
            dict(type="rect", x0=8, y0=70, x1=28, y1=84, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=40, y0=74, x1=60, y1=88, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=72, y0=70, x1=92, y1=84, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=8, y0=18, x1=28, y1=32, fillcolor="#EEF3F7", line=dict(color="#5D6D7E", width=2)),
            dict(type="rect", x0=40, y0=12, x1=60, y1=26, fillcolor="#FDEDEC", line=dict(color="#C0392B", width=2)),
            dict(type="rect", x0=72, y0=18, x1=92, y1=32, fillcolor="#FEF5E7", line=dict(color="#B7950B", width=2)),
            dict(type="rect", x0=72, y0=44, x1=94, y1=58, fillcolor="#EBF5FB", line=dict(color="#2874A6", width=2)),
        ],
        annotations=[
            dict(x=50, y=50, text="<b>Fact_Ventas</b><br>1 fila = 1 ítem vendido", showarrow=False, font=dict(color="white", size=15)),
            dict(x=18, y=77, text="<b>Dim_Cliente</b><br>perfil y ubicación", showarrow=False, font=dict(color="#145A32", size=12)),
            dict(x=50, y=81, text="<b>Dim_Producto</b><br>atributos y categoría", showarrow=False, font=dict(color="#145A32", size=12)),
            dict(x=82, y=77, text="<b>Dim_Vendedor</b><br>seller y origen", showarrow=False, font=dict(color="#145A32", size=12)),
            dict(x=18, y=25, text="<b>Dim_Tiempo</b><br>mes, trimestre, año", showarrow=False, font=dict(color="#34495E", size=12)),
            dict(x=50, y=19, text="<b>Dim_Review</b><br>satisfacción y comentario", showarrow=False, font=dict(color="#922B21", size=12)),
            dict(x=82, y=25, text="<b>Dim_Pago</b><br>método y valor", showarrow=False, font=dict(color="#7D6608", size=12)),
            dict(x=83, y=51, text="<b>Dim_Categoria</b><br>traducción de negocio", showarrow=False, font=dict(color="#1B4F72", size=12)),
        ],
    )
    for x, y in [(18, 70), (50, 74), (82, 70), (18, 32), (50, 26), (82, 32), (72, 51)]:
        fig.add_annotation(x=x, y=y, ax=50, ay=50, xref="x", yref="y", axref="x", ayref="y", showarrow=True, arrowhead=3, arrowsize=1, arrowwidth=2, arrowcolor="rgba(93,109,126,0.75)")
    return fig


def logical_model_diagram() -> go.Figure:
    fig = go.Figure()
    fig.update_layout(
        title="Modelo lógico con joins principales",
        paper_bgcolor="white",
        plot_bgcolor="white",
        margin=dict(l=10, r=10, t=60, b=10),
        xaxis=dict(visible=False, range=[0, 120]),
        yaxis=dict(visible=False, range=[0, 100]),
        height=640,
        shapes=[
            dict(type="rect", x0=3, y0=8, x1=117, y1=92, fillcolor="#FBFCFC", line=dict(color="#E5E8E8", width=1), layer="below"),
            dict(type="rect", x0=5, y0=74, x1=25, y1=90, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=5, y0=48, x1=25, y1=64, fillcolor="#EBF5FB", line=dict(color="#2874A6", width=2)),
            dict(type="rect", x0=35, y0=74, x1=55, y1=90, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=65, y0=74, x1=85, y1=90, fillcolor="#EAF7EF", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=95, y0=48, x1=115, y1=64, fillcolor="#FEF5E7", line=dict(color="#B7950B", width=2)),
            dict(type="rect", x0=35, y0=12, x1=55, y1=28, fillcolor="#FDEDEC", line=dict(color="#C0392B", width=2)),
            dict(type="rect", x0=65, y0=12, x1=85, y1=28, fillcolor="#EEF3F7", line=dict(color="#5D6D7E", width=2)),
            dict(type="rect", x0=42, y0=42, x1=78, y1=62, fillcolor="#17202A", line=dict(color="#17202A", width=2)),
        ],
        annotations=[
            dict(x=15, y=82, text="<b>Orders</b><br>order_id<br>fechas y estado", showarrow=False, font=dict(color="#145A32", size=11)),
            dict(x=15, y=56, text="<b>Customers</b><br>customer_id<br>customer_unique_id", showarrow=False, font=dict(color="#1B4F72", size=11)),
            dict(x=45, y=82, text="<b>Products</b><br>product_id<br>category_name", showarrow=False, font=dict(color="#145A32", size=11)),
            dict(x=75, y=82, text="<b>Sellers</b><br>seller_id<br>seller_state", showarrow=False, font=dict(color="#145A32", size=11)),
            dict(x=105, y=56, text="<b>Payments</b><br>order_id<br>payment_value", showarrow=False, font=dict(color="#7D6608", size=11)),
            dict(x=45, y=20, text="<b>Reviews</b><br>order_id<br>review_score", showarrow=False, font=dict(color="#922B21", size=11)),
            dict(x=75, y=20, text="<b>Translation</b><br>product_category_name", showarrow=False, font=dict(color="#34495E", size=11)),
            dict(x=60, y=52, text="<b>Fact_Ventas</b><br>order_id | order_item_id<br>price | freight | valor_total_item", showarrow=False, font=dict(color="white", size=13)),
        ],
    )
    for x, y, ax, ay in [(15, 74, 50, 52), (25, 56, 42, 52), (45, 74, 54, 62), (75, 74, 66, 62), (95, 56, 78, 52), (45, 28, 50, 42), (65, 20, 55, 74)]:
        fig.add_annotation(x=x, y=y, ax=ax, ay=ay, xref="x", yref="y", axref="x", ayref="y", showarrow=True, arrowhead=3, arrowsize=1, arrowwidth=2, arrowcolor="rgba(93,109,126,0.78)")
    return fig


def physical_model_diagram() -> go.Figure:
    fig = go.Figure()
    fig.update_layout(
        title="Modelo físico sugerido para data mart",
        paper_bgcolor="white",
        plot_bgcolor="white",
        margin=dict(l=10, r=10, t=60, b=10),
        xaxis=dict(visible=False, range=[0, 120]),
        yaxis=dict(visible=False, range=[0, 100]),
        height=650,
        shapes=[
            dict(type="rect", x0=3, y0=8, x1=117, y1=92, fillcolor="#F8F9F9", line=dict(color="#E5E8E8", width=1), layer="below"),
            dict(type="rect", x0=6, y0=72, x1=114, y1=88, fillcolor="#EEF6FB", line=dict(color="#D6EAF8", width=1)),
            dict(type="rect", x0=6, y0=12, x1=114, y1=30, fillcolor="#FDF2E9", line=dict(color="#FAD7A0", width=1)),
            dict(type="rect", x0=8, y0=74, x1=28, y1=86, fillcolor="white", line=dict(color="#2874A6", width=2)),
            dict(type="rect", x0=32, y0=74, x1=52, y1=86, fillcolor="white", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=56, y0=74, x1=76, y1=86, fillcolor="white", line=dict(color="#1D8348", width=2)),
            dict(type="rect", x0=80, y0=74, x1=100, y1=86, fillcolor="white", line=dict(color="#B7950B", width=2)),
            dict(type="rect", x0=38, y0=42, x1=82, y1=60, fillcolor="#17202A", line=dict(color="#17202A", width=2)),
            dict(type="rect", x0=16, y0=14, x1=36, y1=26, fillcolor="white", line=dict(color="#C0392B", width=2)),
            dict(type="rect", x0=50, y0=14, x1=70, y1=26, fillcolor="white", line=dict(color="#5D6D7E", width=2)),
            dict(type="rect", x0=84, y0=14, x1=106, y1=26, fillcolor="white", line=dict(color="#7D3C98", width=2)),
        ],
        annotations=[
            dict(x=60, y=82, text="<b>Capas dimensionales</b>", showarrow=False, font=dict(color="#1B4F72", size=12)),
            dict(x=60, y=21, text="<b>Capas de soporte analítico</b>", showarrow=False, font=dict(color="#AF601A", size=12)),
            dict(x=18, y=80, text="<b>Dim_Cliente</b><br>surrogate key<br>atributos cliente", showarrow=False, font=dict(color="#1B4F72", size=11)),
            dict(x=42, y=80, text="<b>Dim_Producto</b><br>categoría<br>atributos físicos", showarrow=False, font=dict(color="#145A32", size=11)),
            dict(x=66, y=80, text="<b>Dim_Vendedor</b><br>ubicación seller", showarrow=False, font=dict(color="#145A32", size=11)),
            dict(x=90, y=80, text="<b>Dim_Pago</b><br>tipo e installments", showarrow=False, font=dict(color="#7D6608", size=11)),
            dict(x=60, y=51, text="<b>Fact_Ventas</b><br>PK: order_id + order_item_id<br>medidas: price, freight, valor_total_item<br>SLA: dias_hasta_entrega, dias_retraso, entrega_puntual", showarrow=False, font=dict(color="white", size=12)),
            dict(x=26, y=20, text="<b>Dim_Review</b><br>score y comentario", showarrow=False, font=dict(color="#922B21", size=11)),
            dict(x=60, y=20, text="<b>Dim_Tiempo</b><br>día, mes, trimestre, año", showarrow=False, font=dict(color="#34495E", size=11)),
            dict(x=95, y=20, text="<b>Dim_Geolocalizacion</b><br>origen y destino", showarrow=False, font=dict(color="#6C3483", size=11)),
        ],
    )
    for x, y in [(18, 74), (42, 74), (66, 74), (90, 74), (26, 26), (60, 26), (95, 26)]:
        fig.add_annotation(x=x, y=y, ax=60, ay=51, xref="x", yref="y", axref="x", ayref="y", showarrow=True, arrowhead=3, arrowsize=1, arrowwidth=2, arrowcolor="rgba(93,109,126,0.8)")
    return fig
