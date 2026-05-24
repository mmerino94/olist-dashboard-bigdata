"""ETL Olist → SQL Server (OlistDW).

Carga los 9 CSVs de Olist al modelo estrella corregido. Drops + creates.

Uso:
    python etl/load.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import pymssql
from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import (
    CATEGORIAS_ES,
    DATA_DIR,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT,
    DB_USER,
    REGION_BY_STATE,
    SCHEMA_PATH,
    TIPOS_PAGO_ES,
)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def run_schema_sql() -> None:
    log(f"Ejecutando {SCHEMA_PATH.name} (drop + create)...")
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    batches = [b.strip() for b in sql.split("\nGO\n") if b.strip()]
    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database="master", autocommit=True)
    cur = conn.cursor()
    for batch in batches:
        cur.execute(batch)
    conn.close()
    log("Schema creado.")


def engine():
    url = f"mssql+pymssql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return create_engine(url)


def load_csvs() -> dict[str, pd.DataFrame]:
    log(f"Leyendo CSVs desde {DATA_DIR}")
    files = {
        "customers": "olist_customers_dataset.csv",
        "orders": "olist_orders_dataset.csv",
        "items": "olist_order_items_dataset.csv",
        "payments": "olist_order_payments_dataset.csv",
        "reviews": "olist_order_reviews_dataset.csv",
        "products": "olist_products_dataset.csv",
        "sellers": "olist_sellers_dataset.csv",
        "geolocation": "olist_geolocation_dataset.csv",
        "translation": "product_category_name_translation.csv",
    }
    out = {}
    for k, fname in files.items():
        df = pd.read_csv(DATA_DIR / fname)
        log(f"  {k:<13} {len(df):>8,} filas")
        out[k] = df
    return out


def build_dim_tiempo(orders: pd.DataFrame) -> pd.DataFrame:
    purchase = pd.to_datetime(orders["order_purchase_timestamp"], errors="coerce")
    fechas = pd.DatetimeIndex(purchase.dt.normalize().dropna().unique()).sort_values()
    df = pd.DataFrame({"fecha": fechas})
    df["id_tiempo"] = df["fecha"].dt.strftime("%Y%m%d").astype(int)
    df["anio"] = df["fecha"].dt.year.astype("int16")
    df["mes"] = df["fecha"].dt.month.astype("int8")
    df["trimestre"] = df["fecha"].dt.quarter.astype("int8")
    dia_map = {0: "Lunes", 1: "Martes", 2: "Miercoles", 3: "Jueves",
               4: "Viernes", 5: "Sabado", 6: "Domingo"}
    df["dia_semana"] = df["fecha"].dt.dayofweek.map(dia_map)
    df["es_fin_semana"] = df["fecha"].dt.dayofweek.isin([5, 6]).astype("int8")
    return df[["id_tiempo", "fecha", "anio", "mes", "trimestre",
               "dia_semana", "es_fin_semana"]]


def _norm_zip(s):
    return s.astype(str).str.zfill(5).str.strip()


def _norm_text(s):
    return s.fillna("").astype(str).str.strip().str.lower()


def build_dim_geografia(customers, sellers, geolocation) -> pd.DataFrame:
    geo_agg = (
        geolocation.groupby("geolocation_zip_code_prefix", as_index=False)
        .agg(latitud=("geolocation_lat", "mean"),
             longitud=("geolocation_lng", "mean"))
    )
    cust_geo = pd.DataFrame({
        "zip_prefix": _norm_zip(customers["customer_zip_code_prefix"]),
        "ciudad": _norm_text(customers["customer_city"]),
        "estado": _norm_text(customers["customer_state"]).str.upper(),
    })
    sell_geo = pd.DataFrame({
        "zip_prefix": _norm_zip(sellers["seller_zip_code_prefix"]),
        "ciudad": _norm_text(sellers["seller_city"]),
        "estado": _norm_text(sellers["seller_state"]).str.upper(),
    })
    geo = pd.concat([cust_geo, sell_geo], ignore_index=True)
    geo = geo.drop_duplicates(subset=["zip_prefix", "ciudad", "estado"]).reset_index(drop=True)
    geo = geo.merge(
        geo_agg.assign(zip_prefix=lambda d: _norm_zip(d["geolocation_zip_code_prefix"]))
              [["zip_prefix", "latitud", "longitud"]],
        on="zip_prefix", how="left",
    )
    geo["region"] = geo["estado"].map(REGION_BY_STATE).fillna("Desconocido")
    return geo[["zip_prefix", "ciudad", "estado", "region", "latitud", "longitud"]]


def _attach_geo(df, zip_col, city_col, state_col, geo_lookup):
    df = df.copy()
    df["_zip"] = _norm_zip(df[zip_col])
    df["_ciudad"] = _norm_text(df[city_col])
    df["_estado"] = _norm_text(df[state_col]).str.upper()
    return df.merge(
        geo_lookup.rename(columns={"zip_prefix": "_zip",
                                    "ciudad": "_ciudad",
                                    "estado": "_estado"}),
        on=["_zip", "_ciudad", "_estado"], how="left",
    )


def build_dim_cliente(customers, geo_lookup) -> pd.DataFrame:
    df = _attach_geo(customers, "customer_zip_code_prefix",
                     "customer_city", "customer_state", geo_lookup)
    df = df.rename(columns={"customer_id": "id_cliente"})
    return df[["id_cliente", "customer_unique_id", "id_geografia"]]


def build_dim_vendedor(sellers, geo_lookup) -> pd.DataFrame:
    df = _attach_geo(sellers, "seller_zip_code_prefix",
                     "seller_city", "seller_state", geo_lookup)
    df = df.rename(columns={"seller_id": "id_vendedor"})
    return df[["id_vendedor", "id_geografia"]]


def build_dim_producto(products, translation, items) -> pd.DataFrame:
    df = products.merge(translation, how="left", on="product_category_name")
    df["categoria"] = (
        df["product_category_name_english"].fillna(df["product_category_name"])
    )
    df["categoria"] = df["categoria"].map(lambda c: CATEGORIAS_ES.get(c, c) if pd.notna(c) else c)
    if not items.empty:
        precios = items.groupby("product_id", as_index=False)["price"].mean()
        bins = precios["price"].quantile([0, 0.33, 0.66, 1.0]).tolist()
        bins = sorted(set(bins))
        if len(bins) >= 4:
            precios["rango_precio"] = pd.cut(
                precios["price"], bins=bins, labels=["Bajo", "Medio", "Alto"],
                include_lowest=True, duplicates="drop",
            ).astype(str)
        else:
            precios["rango_precio"] = "Estable"
        df = df.merge(precios[["product_id", "rango_precio"]],
                      on="product_id", how="left")
    df["rango_precio"] = df["rango_precio"].fillna("Sin clasificar")
    df = df.rename(columns={
        "product_id": "id_producto",
        "product_weight_g": "peso_gramos",
        "product_height_cm": "alto_cm",
        "product_width_cm": "ancho_cm",
        "product_length_cm": "largo_cm",
    })
    return df[["id_producto", "categoria", "rango_precio",
               "peso_gramos", "alto_cm", "ancho_cm", "largo_cm"]]


def build_dim_pago(payments) -> pd.DataFrame:
    df = (payments[["payment_type", "payment_installments"]]
          .drop_duplicates()
          .rename(columns={"payment_type": "tipo_pago",
                           "payment_installments": "num_cuotas"}))
    df["tipo_pago"] = df["tipo_pago"].map(lambda t: TIPOS_PAGO_ES.get(t, t))
    df["num_cuotas"] = df["num_cuotas"].clip(lower=0, upper=255).astype("int16")
    return df.reset_index(drop=True)


def build_dim_resena(reviews) -> pd.DataFrame:
    df = reviews.copy()
    df["puntuacion_review"] = df["review_score"].astype("int8")
    df["satisfaccion"] = pd.cut(
        df["puntuacion_review"], bins=[0, 2, 3, 5],
        labels=["Mala", "Regular", "Buena"], include_lowest=True, right=True,
    ).astype(str)
    df["escribio_comentario"] = (
        df["review_comment_message"].fillna("").str.strip().ne("").astype("int8")
    )
    df["fecha_creacion"] = pd.to_datetime(df["review_creation_date"], errors="coerce").dt.date
    df["fecha_respuesta"] = pd.to_datetime(df["review_answer_timestamp"], errors="coerce").dt.date
    df = df.rename(columns={
        "review_id": "id_resena",
        "order_id": "id_pedido",
        "review_comment_title": "comentario_titulo",
        "review_comment_message": "comentario_texto",
    })
    df = (df.sort_values("fecha_respuesta")
            .drop_duplicates(subset=["id_pedido"], keep="last")
            .drop_duplicates(subset=["id_resena"], keep="last"))
    return df[["id_resena", "id_pedido", "puntuacion_review", "satisfaccion",
               "escribio_comentario", "comentario_titulo", "comentario_texto",
               "fecha_creacion", "fecha_respuesta"]]


def build_fact_ventas(items, orders, payments, dim_pago, dim_geo,
                      customers, sellers) -> pd.DataFrame:
    pago_agg = (payments.groupby("order_id", as_index=False).agg(
        tipo_pago=("payment_type", lambda s: s.mode().iloc[0] if not s.mode().empty else "no_disponible"),
        num_cuotas=("payment_installments", "max"),
    ))
    pago_agg["tipo_pago"] = pago_agg["tipo_pago"].map(lambda t: TIPOS_PAGO_ES.get(t, t))
    pago_agg["num_cuotas"] = pago_agg["num_cuotas"].clip(lower=0, upper=255).astype("int16")
    pago_agg = pago_agg.merge(dim_pago, on=["tipo_pago", "num_cuotas"], how="left")

    cust = _attach_geo(
        customers[["customer_id", "customer_zip_code_prefix",
                   "customer_city", "customer_state"]],
        "customer_zip_code_prefix", "customer_city", "customer_state", dim_geo,
    ).rename(columns={"id_geografia": "id_geografia_cli"})

    sell = _attach_geo(
        sellers[["seller_id", "seller_zip_code_prefix",
                 "seller_city", "seller_state"]],
        "seller_zip_code_prefix", "seller_city", "seller_state", dim_geo,
    ).rename(columns={"id_geografia": "id_geografia_ven"})

    fact = (
        items.merge(orders, on="order_id", how="left")
             .merge(cust[["customer_id", "id_geografia_cli"]], on="customer_id", how="left")
             .merge(sell[["seller_id", "id_geografia_ven"]], on="seller_id", how="left")
             .merge(pago_agg[["order_id", "id_pago"]], on="order_id", how="left")
    )

    fact["order_purchase_timestamp"] = pd.to_datetime(fact["order_purchase_timestamp"], errors="coerce")
    fact["order_delivered_customer_date"] = pd.to_datetime(fact["order_delivered_customer_date"], errors="coerce")
    fact["order_estimated_delivery_date"] = pd.to_datetime(fact["order_estimated_delivery_date"], errors="coerce")

    fact["id_tiempo"] = fact["order_purchase_timestamp"].dt.strftime("%Y%m%d")
    fact["valor_total"] = (fact["price"] + fact["freight_value"]).round(2)
    fact["flete_sobre_precio"] = np.where(
        fact["price"] > 0, (fact["freight_value"] / fact["price"] * 100).round(2), np.nan
    )
    fact["dias_hasta_entrega"] = (
        fact["order_delivered_customer_date"] - fact["order_purchase_timestamp"]
    ).dt.days
    fact["dias_retraso"] = (
        fact["order_delivered_customer_date"] - fact["order_estimated_delivery_date"]
    ).dt.days
    fact["entrego_a_tiempo"] = np.where(
        fact["dias_retraso"].fillna(0) <= 0, 1, 0
    ).astype("int8")

    fact = fact.dropna(subset=["id_tiempo", "id_pago", "id_geografia_cli", "id_geografia_ven"])
    fact["id_tiempo"] = fact["id_tiempo"].astype(int)

    fact = fact.rename(columns={
        "order_id": "id_pedido",
        "order_status": "estado_pedido",
        "customer_id": "id_cliente",
        "product_id": "id_producto",
        "seller_id": "id_vendedor",
        "price": "precio",
        "freight_value": "flete",
    })
    return fact[["id_pedido", "estado_pedido", "id_cliente", "id_producto",
                 "id_vendedor", "id_tiempo", "id_pago",
                 "id_geografia_cli", "id_geografia_ven",
                 "precio", "flete", "valor_total", "flete_sobre_precio",
                 "dias_hasta_entrega", "dias_retraso", "entrego_a_tiempo"]]


def insert_df(eng, df: pd.DataFrame, table: str, chunksize: int = 5000) -> None:
    log(f"  → {table:<14} insertando {len(df):,} filas...")
    df.to_sql(table, eng, if_exists="append", index=False,
              chunksize=chunksize, method=None)


def main() -> None:
    t0 = time.time()
    run_schema_sql()
    raw = load_csvs()
    eng = engine()

    log("Construyendo dimensiones...")
    dim_tiempo = build_dim_tiempo(raw["orders"])
    dim_geo = build_dim_geografia(raw["customers"], raw["sellers"], raw["geolocation"])
    dim_pago = build_dim_pago(raw["payments"])

    insert_df(eng, dim_tiempo, "DIM_TIEMPO")
    insert_df(eng, dim_geo, "DIM_GEOGRAFIA")
    insert_df(eng, dim_pago, "DIM_PAGO")

    geo_lookup = pd.read_sql("SELECT id_geografia, zip_prefix, ciudad, estado FROM DIM_GEOGRAFIA", eng)
    pago_lookup = pd.read_sql("SELECT id_pago, tipo_pago, num_cuotas FROM DIM_PAGO", eng)

    dim_cliente = build_dim_cliente(raw["customers"], geo_lookup)
    dim_vendedor = build_dim_vendedor(raw["sellers"], geo_lookup)
    dim_producto = build_dim_producto(raw["products"], raw["translation"], raw["items"])
    dim_resena = build_dim_resena(raw["reviews"])

    insert_df(eng, dim_cliente, "DIM_CLIENTE")
    insert_df(eng, dim_vendedor, "DIM_VENDEDOR")
    insert_df(eng, dim_producto, "DIM_PRODUCTO")
    insert_df(eng, dim_resena, "DIM_RESENA")

    log("Construyendo FACT_VENTAS...")
    fact = build_fact_ventas(
        raw["items"], raw["orders"], raw["payments"], pago_lookup,
        geo_lookup, raw["customers"], raw["sellers"],
    )

    valid_clientes = set(dim_cliente["id_cliente"])
    valid_productos = set(dim_producto["id_producto"])
    valid_vendedores = set(dim_vendedor["id_vendedor"])
    valid_tiempos = set(dim_tiempo["id_tiempo"].astype(int))
    before = len(fact)
    fact = fact[
        fact["id_cliente"].isin(valid_clientes)
        & fact["id_producto"].isin(valid_productos)
        & fact["id_vendedor"].isin(valid_vendedores)
        & fact["id_tiempo"].isin(valid_tiempos)
    ]
    log(f"  filtrados FK: {before:,} → {len(fact):,}")

    insert_df(eng, fact, "FACT_VENTAS", chunksize=2000)

    with eng.connect() as c:
        for t in ("DIM_TIEMPO", "DIM_GEOGRAFIA", "DIM_CLIENTE", "DIM_VENDEDOR",
                  "DIM_PRODUCTO", "DIM_PAGO", "DIM_RESENA", "FACT_VENTAS"):
            n = c.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            log(f"  {t:<14} {n:>10,}")

    log(f"OK. Tiempo total: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
