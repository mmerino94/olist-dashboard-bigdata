from __future__ import annotations

import pandas as pd


def build_summary_kpis(fact: pd.DataFrame) -> list[dict]:
    total_revenue = fact["valor_total_item"].sum()
    total_orders = fact["order_id"].nunique()
    avg_ticket = total_revenue / total_orders if total_orders else 0
    satisfaction = (fact["review_score"] >= 4).mean()
    on_time = fact["entrega_puntual"].mean()
    return [
        {"label": "Ingreso total", "value": total_revenue, "kind": "currency"},
        {"label": "Pedidos", "value": total_orders, "kind": "number"},
        {"label": "Ticket promedio", "value": avg_ticket, "kind": "currency"},
        {"label": "Satisfacción", "value": satisfaction, "kind": "pct"},
        {"label": "Entrega puntual", "value": on_time, "kind": "pct"},
    ]


def build_executive_metrics(delivery_metrics: pd.DataFrame) -> list[dict]:
    avg_delivery = delivery_metrics["dias_entrega_promedio"].mean()
    avg_delay = delivery_metrics["dias_retraso_promedio"].mean()
    on_time = delivery_metrics["puntualidad"].mean()
    return [
        {"label": "Tiempo promedio entrega", "value": avg_delivery, "kind": "days"},
        {"label": "Puntualidad", "value": on_time, "kind": "pct"},
        {"label": "Días promedio de retraso", "value": avg_delay, "kind": "days"},
    ]


def build_executive_findings(fact: pd.DataFrame) -> tuple[list[str], list[str]]:
    by_category = fact.groupby("category_name", as_index=False)["valor_total_item"].sum().sort_values(
        "valor_total_item", ascending=False
    )
    top_category = by_category.iloc[0]["category_name"] if not by_category.empty else "Sin dato"

    one_time_share = (
        fact.groupby("customer_unique_id")["order_id"].nunique().eq(1).mean()
        if not fact.empty
        else 0
    )
    delay_share = 1 - fact["entrega_puntual"].mean() if not fact.empty else 0
    bad_reviews = fact["porcentaje_review_mala_flag"].mean() if not fact.empty else 0

    findings = [
        f"La categoría con mayor ingreso en el corte actual es {top_category}.",
        f"El {one_time_share:.1%} de los clientes compró una sola vez, señal clara de fuga post primera compra.",
        f"El {delay_share:.1%} de los ítems llega con retraso y el {bad_reviews:.1%} concentra reseñas malas.",
    ]
    recommendations = [
        "Concentrar inversión comercial en categorías líderes con buena puntualidad y baja incidencia de reseñas negativas.",
        "Diseñar campañas de segunda compra para clientes de una sola orden dentro de los primeros 60 días.",
        "Escalar monitoreo de SLA y calidad para sellers con retraso recurrente antes de ampliar exposición comercial.",
    ]
    return findings, recommendations


def build_segment_recommendations() -> dict[str, str]:
    return {
        "VIP": "Fidelización premium, bundles exclusivos y preventa.",
        "Frecuentes": "Cross-sell y programas de puntos para elevar ticket.",
        "En riesgo": "Campañas reactivas con incentivo corto y seguimiento de experiencia.",
        "Dormidos": "Remarketing con categorías históricas y ofertas de retorno.",
        "Perdidos": "Recuperación selectiva; limitar inversión si el CAC no cierra.",
    }
