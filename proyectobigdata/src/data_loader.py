from __future__ import annotations

from pathlib import Path

import pandas as pd


class DataLoadError(Exception):
    pass


DATA_FILES = {
    "olist_customers_dataset": "olist_customers_dataset.csv",
    "olist_orders_dataset": "olist_orders_dataset.csv",
    "olist_order_items_dataset": "olist_order_items_dataset.csv",
    "olist_order_payments_dataset": "olist_order_payments_dataset.csv",
    "olist_order_reviews_dataset": "olist_order_reviews_dataset.csv",
    "olist_products_dataset": "olist_products_dataset.csv",
    "olist_sellers_dataset": "olist_sellers_dataset.csv",
    "olist_geolocation_dataset": "olist_geolocation_dataset.csv",
    "product_category_name_translation": "product_category_name_translation.csv",
}


DATE_COLUMNS = {
    "olist_orders_dataset": [
        "order_purchase_timestamp",
        "order_approved_at",
        "order_delivered_carrier_date",
        "order_delivered_customer_date",
        "order_estimated_delivery_date",
    ],
    "olist_order_reviews_dataset": [
        "review_creation_date",
        "review_answer_timestamp",
    ],
    "olist_order_items_dataset": ["shipping_limit_date"],
}


def _read_csv(path: Path, parse_dates: list[str] | None = None) -> pd.DataFrame:
    return pd.read_csv(path, parse_dates=parse_dates, encoding="utf-8", low_memory=False)


def load_olist_data(data_dir: Path) -> dict[str, pd.DataFrame]:
    if not data_dir.exists():
        raise DataLoadError(
            f"No existe la carpeta de datos: {data_dir}. Crea `data/` y coloca los CSV del dataset Olist."
        )

    missing = [filename for filename in DATA_FILES.values() if not (data_dir / filename).exists()]
    if missing:
        missing_list = ", ".join(missing)
        raise DataLoadError(
            f"Faltan archivos requeridos en `data/`: {missing_list}."
        )

    frames: dict[str, pd.DataFrame] = {}
    for logical_name, filename in DATA_FILES.items():
        frames[logical_name] = _read_csv(
            data_dir / filename,
            parse_dates=DATE_COLUMNS.get(logical_name),
        )
    return frames
