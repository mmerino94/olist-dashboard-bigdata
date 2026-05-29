"""P4: Desempeño de vendedores y semáforo."""
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/p4", tags=["p4-vendedores"])


def _seller_metrics(f: Filters) -> pd.DataFrame:
    where, params = where_clause(f)
    sql = f"""
        SELECT
            f.id_vendedor,
            geov.estado AS estado,
            geov.region AS region,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(SUM(f.valor_total), 2) AS ingreso,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))), 4) AS puntualidad,
            ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating,
            ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) /
                  NULLIF(COUNT(r.id_resena), 0), 1) AS pct_malas,
            ROUND(AVG(CASE WHEN f.dias_retraso > 0 THEN CAST(f.dias_retraso AS DECIMAL(8,2)) END), 1) AS retraso_avg
        FROM FACT_VENTAS f
        JOIN DIM_GEOGRAFIA geov ON f.id_geografia_ven = geov.id_geografia
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY f.id_vendedor, geov.estado, geov.region
        HAVING COUNT(DISTINCT f.id_pedido) >= 5
    """
    df = query(sql, params)
    df["rating"] = df["rating"].fillna(0)
    df["pct_malas"] = df["pct_malas"].fillna(0)
    df["retraso_avg"] = df["retraso_avg"].fillna(0)
    df["score"] = (
        df["puntualidad"].astype(float) * 40
        + (df["rating"].astype(float) / 5) * 35
        + (1 - df["pct_malas"].astype(float) / 100) * 15
        + np.clip(1 - (df["retraso_avg"].astype(float) / 10), 0, 1) * 10
    ).round(1)
    df["clasificacion"] = pd.cut(
        df["score"], bins=[0, 60, 75, 88, 100],
        labels=["Crítico", "En observación", "Estándar", "Elite"],
        include_lowest=True,
    ).astype(str)
    return df.sort_values("score", ascending=False)


@router.get("/semaforo")
def semaforo(f: Filters = Depends(filter_dep)):
    df = _seller_metrics(f)
    if df.empty:
        return []
    out = df.groupby("clasificacion").agg(
        vendedores=("id_vendedor", "count"),
        ingreso=("ingreso", "sum"),
        rating_avg=("rating", "mean"),
        puntualidad_avg=("puntualidad", "mean"),
    ).round(2).reset_index()
    out["pct_vendedores"] = (out["vendedores"] / out["vendedores"].sum() * 100).round(1)
    out["pct_ingreso"] = (out["ingreso"] / out["ingreso"].sum() * 100).round(1)
    return out.to_dict(orient="records")


@router.get("/top")
def top_vendedores(f: Filters = Depends(filter_dep), tipo: str = "mejores", n: int = 10):
    df = _seller_metrics(f)
    if df.empty:
        return []
    if tipo == "peores":
        df = df.sort_values("score", ascending=True)
    return df.head(n).to_dict(orient="records")


@router.get("/scatter")
def scatter_vendedores(f: Filters = Depends(filter_dep), min_pedidos: int = 5):
    """Todos los vendedores (con >= min_pedidos) para el cuadrante de desempeño."""
    df = _seller_metrics(f)
    if df.empty:
        return []
    df = df[df["pedidos"] >= min_pedidos]
    cols = ["id_vendedor", "region", "pedidos", "ingreso",
            "puntualidad", "rating", "clasificacion"]
    return df[cols].to_dict(orient="records")
