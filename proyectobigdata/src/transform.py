from __future__ import annotations

import re

import numpy as np
import pandas as pd


def _mode_text(series: pd.Series) -> str | None:
    clean = series.dropna()
    if clean.empty:
        return None
    return clean.mode().iloc[0]


def prepare_analytic_model(data: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    customers = data["olist_customers_dataset"].copy()
    orders = data["olist_orders_dataset"].copy()
    items = data["olist_order_items_dataset"].copy()
    payments = data["olist_order_payments_dataset"].copy()
    reviews = data["olist_order_reviews_dataset"].copy()
    products = data["olist_products_dataset"].copy()
    sellers = data["olist_sellers_dataset"].copy()
    geolocation = data["olist_geolocation_dataset"].copy()
    translation = data["product_category_name_translation"].copy()

    geo_customer = (
        geolocation.groupby("geolocation_zip_code_prefix", as_index=False)
        .agg(
            geolocation_lat=("geolocation_lat", "mean"),
            geolocation_lng=("geolocation_lng", "mean"),
            geolocation_city=("geolocation_city", _mode_text),
            geolocation_state=("geolocation_state", _mode_text),
        )
        .rename(
            columns={
                "geolocation_zip_code_prefix": "customer_zip_code_prefix",
                "geolocation_lat": "customer_lat",
                "geolocation_lng": "customer_lng",
            }
        )
    )

    geo_seller = (
        geolocation.groupby("geolocation_zip_code_prefix", as_index=False)
        .agg(
            geolocation_lat=("geolocation_lat", "mean"),
            geolocation_lng=("geolocation_lng", "mean"),
        )
        .rename(
            columns={
                "geolocation_zip_code_prefix": "seller_zip_code_prefix",
                "geolocation_lat": "seller_lat",
                "geolocation_lng": "seller_lng",
            }
        )
    )

    payments_agg = payments.groupby("order_id", as_index=False).agg(
        payment_value=("payment_value", "sum"),
        payment_installments=("payment_installments", "max"),
        payment_type=("payment_type", _mode_text),
    )

    reviews["escribio_comentario"] = reviews["review_comment_message"].fillna("").str.strip().ne("").astype(int)
    reviews["satisfaccion_cliente"] = pd.cut(
        reviews["review_score"],
        bins=[0, 2, 3, 5],
        labels=["Mala", "Regular", "Buena"],
        include_lowest=True,
        right=True,
    )
    reviews_agg = reviews.groupby("order_id", as_index=False).agg(
        review_score=("review_score", "mean"),
        review_comment_message=("review_comment_message", _mode_text),
        escribio_comentario=("escribio_comentario", "max"),
        satisfaccion_cliente=("satisfaccion_cliente", _mode_text),
    )

    products = products.merge(
        translation,
        how="left",
        on="product_category_name",
    )
    products["category_name"] = products["product_category_name_english"].fillna(
        products["product_category_name"]
    )
    products["rango_precio_producto"] = "No clasificado"

    order_totals = items.assign(
        valor_total_item=items["price"] + items["freight_value"]
    ).groupby("order_id", as_index=False).agg(
        valor_total_pedido=("valor_total_item", "sum")
    )

    fact = (
        items.merge(orders, how="left", on="order_id")
        .merge(customers, how="left", on="customer_id")
        .merge(products, how="left", on="product_id")
        .merge(sellers, how="left", on="seller_id")
        .merge(payments_agg, how="left", on="order_id")
        .merge(reviews_agg, how="left", on="order_id")
        .merge(order_totals, how="left", on="order_id")
        .merge(geo_customer, how="left", on="customer_zip_code_prefix")
        .merge(geo_seller, how="left", on="seller_zip_code_prefix")
    )

    fact["valor_total_item"] = fact["price"] + fact["freight_value"]
    fact["dias_hasta_entrega"] = (
        fact["order_delivered_customer_date"] - fact["order_purchase_timestamp"]
    ).dt.days
    fact["dias_retraso"] = (
        fact["order_delivered_customer_date"] - fact["order_estimated_delivery_date"]
    ).dt.days
    fact["dias_retraso"] = fact["dias_retraso"].fillna(0)
    fact["entrega_puntual"] = np.where(fact["dias_retraso"] <= 0, 1, 0)
    fact["flete_sobre_precio"] = np.where(
        fact["price"] > 0, fact["freight_value"] / fact["price"], np.nan
    )
    fact["mes_compra"] = fact["order_purchase_timestamp"].dt.to_period("M").astype(str)
    fact["trimestre_compra"] = (
        "T" + fact["order_purchase_timestamp"].dt.quarter.astype(str)
        + "-" + fact["order_purchase_timestamp"].dt.year.astype(str)
    )
    fact["anio_compra"] = fact["order_purchase_timestamp"].dt.year
    fact["ruta_logistica"] = fact["seller_state"].fillna("NA") + " -> " + fact["customer_state"].fillna("NA")
    fact["review_score"] = fact["review_score"].fillna(0)
    fact["satisfaccion_cliente"] = fact["satisfaccion_cliente"].astype("object").fillna("Sin review")
    fact["escribio_comentario"] = fact["escribio_comentario"].fillna(0).astype(int)
    fact["porcentaje_review_mala_flag"] = np.where(fact["review_score"].between(1, 2), 1, 0)
    fact["fecha_referencia"] = fact["order_purchase_timestamp"].max()

    valid_prices = fact["price"].dropna()
    if not valid_prices.empty:
        bins = valid_prices.quantile([0, 0.33, 0.66, 1.0]).tolist()
        bins = sorted(set(bins))
        if len(bins) >= 4:
            fact["rango_precio_producto"] = pd.cut(
                fact["price"],
                bins=bins,
                labels=["Bajo", "Medio", "Alto"],
                include_lowest=True,
                duplicates="drop",
            ).astype(str)
        else:
            fact["rango_precio_producto"] = "Estable"

    return {"fact_sales": fact}


def apply_filters(fact: pd.DataFrame, filters: dict) -> pd.DataFrame:
    filtered = fact.copy()
    start_date, end_date = filters["date_range"]
    filtered = filtered[
        filtered["order_purchase_timestamp"].dt.date.between(start_date, end_date)
    ]
    if filters["states"]:
        filtered = filtered[filtered["customer_state"].isin(filters["states"])]
    if filters["categories"]:
        filtered = filtered[filtered["category_name"].isin(filters["categories"])]
    return filtered


def build_category_metrics(fact: pd.DataFrame) -> pd.DataFrame:
    total = fact["valor_total_item"].sum() or 1
    category = fact.groupby("category_name", as_index=False).agg(
        ingreso_total=("valor_total_item", "sum"),
        ticket_promedio=("valor_total_item", "mean"),
        porcentaje_resenas_malas=("porcentaje_review_mala_flag", "mean"),
        porcentaje_retraso=("entrega_puntual", lambda s: 1 - s.mean()),
        pedidos=("order_id", "nunique"),
    )
    category["participacion"] = category["ingreso_total"] / total
    category = category.sort_values("ingreso_total", ascending=False)
    category["participacion_acumulada"] = category["participacion"].cumsum()
    category["clasificacion_pareto"] = np.where(
        category["participacion_acumulada"] <= 0.8, "Core 80%", "Long Tail"
    )
    return category


def build_customer_segments(fact: pd.DataFrame) -> pd.DataFrame:
    snapshot = fact["order_purchase_timestamp"].max() + pd.Timedelta(days=1)
    customers = fact.groupby("customer_unique_id", as_index=False).agg(
        recency_days=("order_purchase_timestamp", lambda s: (snapshot - s.max()).days),
        frequency_orders=("order_id", "nunique"),
        monetary_value=("valor_total_item", "sum"),
        review_score_mean=("review_score", "mean"),
    )
    customers["one_time_customer"] = np.where(customers["frequency_orders"] == 1, "Una sola compra", "Recurrente")

    customers["r_score"] = pd.qcut(customers["recency_days"].rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
    customers["f_score"] = pd.qcut(customers["frequency_orders"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    customers["m_score"] = pd.qcut(customers["monetary_value"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    customers["rfm_score"] = customers["r_score"] + customers["f_score"] + customers["m_score"]

    conditions = [
        (customers["r_score"] >= 4) & (customers["f_score"] >= 4) & (customers["m_score"] >= 4),
        (customers["r_score"] >= 3) & (customers["f_score"] >= 3),
        (customers["r_score"] <= 2) & (customers["f_score"] >= 3),
        (customers["r_score"] <= 2) & (customers["f_score"] <= 2) & (customers["m_score"] >= 3),
    ]
    choices = ["VIP", "Frecuentes", "En riesgo", "Dormidos"]
    customers["segmento"] = np.select(conditions, choices, default="Perdidos")
    return customers


def build_delivery_metrics(fact: pd.DataFrame) -> pd.DataFrame:
    delivery = fact.groupby(["seller_state", "customer_state", "ruta_logistica"], as_index=False).agg(
        ordenes=("order_id", "nunique"),
        dias_entrega_promedio=("dias_hasta_entrega", "mean"),
        dias_retraso_promedio=("dias_retraso", "mean"),
        puntualidad=("entrega_puntual", "mean"),
        review_promedio=("review_score", "mean"),
    )
    delivery["porcentaje_retraso"] = 1 - delivery["puntualidad"]
    return delivery


def build_seller_metrics(fact: pd.DataFrame) -> pd.DataFrame:
    total_income = fact["valor_total_item"].sum() or 1
    seller = fact.groupby("seller_id", as_index=False).agg(
        ingreso_total=("valor_total_item", "sum"),
        pedidos=("order_id", "nunique"),
        puntualidad=("entrega_puntual", "mean"),
        review_promedio=("review_score", "mean"),
        porcentaje_resenas_malas=("porcentaje_review_mala_flag", "mean"),
        dias_retraso_promedio=("dias_retraso", "mean"),
    )
    seller["participacion_ingreso"] = seller["ingreso_total"] / total_income
    seller["score_vendedor"] = (
        seller["puntualidad"] * 40
        + (seller["review_promedio"] / 5) * 35
        + (1 - seller["porcentaje_resenas_malas"]) * 15
        + np.clip(1 - (seller["dias_retraso_promedio"] / 10), 0, 1) * 10
    ).round(1)
    seller["clasificacion_vendedor"] = pd.cut(
        seller["score_vendedor"],
        bins=[0, 60, 75, 88, 100],
        labels=["Crítico", "En observación", "Estándar", "Elite"],
        include_lowest=True,
    ).astype(str)
    return seller.sort_values("score_vendedor", ascending=False)


def build_text_review_terms(fact: pd.DataFrame, top_n: int = 15) -> pd.DataFrame:
    negative = fact.loc[
        fact["review_score"].between(1, 2) & fact["review_comment_message"].notna(),
        "review_comment_message",
    ].astype(str)
    tokens: dict[str, int] = {}
    stopwords = {
        "de", "da", "do", "e", "o", "a", "que", "na", "no", "para", "com",
        "muito", "mais", "foi", "uma", "um", "em", "por", "os", "as", "não",
    }
    for message in negative:
        for token in re.findall(r"[A-Za-zÀ-ÿ]{4,}", message.lower()):
            if token not in stopwords:
                tokens[token] = tokens.get(token, 0) + 1

    terms = pd.DataFrame(
        [{"termino": term, "frecuencia": freq} for term, freq in sorted(tokens.items(), key=lambda x: x[1], reverse=True)]
    )
    if terms.empty:
        return pd.DataFrame({"termino": ["sin datos"], "frecuencia": [0]})
    return terms.head(top_n)
