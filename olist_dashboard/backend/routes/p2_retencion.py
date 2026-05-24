"""P2: Retención y RFM."""
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/p2", tags=["p2-retencion"])


def _customer_rfm(f: Filters) -> pd.DataFrame:
    where, params = where_clause(f)
    sql = f"""
        SELECT
            c.customer_unique_id,
            COUNT(DISTINCT f.id_pedido) AS frequency,
            SUM(f.valor_total) AS monetary,
            MAX(t.fecha) AS ultima_compra
        FROM FACT_VENTAS f
        JOIN DIM_CLIENTE c ON f.id_cliente = c.id_cliente
        JOIN DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY c.customer_unique_id
    """
    df = query(sql, params)
    df["ultima_compra"] = pd.to_datetime(df["ultima_compra"])
    snapshot = df["ultima_compra"].max() + pd.Timedelta(days=1)
    df["recency"] = (snapshot - df["ultima_compra"]).dt.days

    if df.empty:
        return df

    df["r_score"] = pd.qcut(df["recency"].rank(method="first"),
                            5, labels=[5, 4, 3, 2, 1]).astype(int)
    df["f_score"] = pd.qcut(df["frequency"].rank(method="first"),
                            5, labels=[1, 2, 3, 4, 5]).astype(int)
    df["m_score"] = pd.qcut(df["monetary"].rank(method="first"),
                            5, labels=[1, 2, 3, 4, 5]).astype(int)
    df["rfm"] = df["r_score"] + df["f_score"] + df["m_score"]

    cond = [
        (df["r_score"] >= 4) & (df["f_score"] >= 4) & (df["m_score"] >= 4),
        (df["r_score"] >= 3) & (df["f_score"] >= 3),
        (df["r_score"] <= 2) & (df["f_score"] >= 3),
        (df["r_score"] <= 2) & (df["f_score"] <= 2) & (df["m_score"] >= 3),
    ]
    seg = ["VIP", "Frecuentes", "En riesgo", "Dormidos"]
    df["segmento"] = np.select(cond, seg, default="Perdidos")
    return df


@router.get("/segmentos")
def segmentos(f: Filters = Depends(filter_dep)):
    df = _customer_rfm(f)
    if df.empty:
        return []
    out = df.groupby("segmento").agg(
        clientes=("customer_unique_id", "count"),
        ingreso=("monetary", "sum"),
        ticket_avg=("monetary", "mean"),
        recency_avg=("recency", "mean"),
        frequency_avg=("frequency", "mean"),
    ).round(2).reset_index()
    out["pct_clientes"] = (out["clientes"] / out["clientes"].sum() * 100).round(1)
    out["pct_ingreso"] = (out["ingreso"] / out["ingreso"].sum() * 100).round(1)
    return out.to_dict(orient="records")


@router.get("/recompra")
def tasa_recompra(f: Filters = Depends(filter_dep)):
    df = _customer_rfm(f)
    if df.empty:
        return {"clientes_unicos": 0, "una_compra": 0, "recurrentes": 0,
                "tasa_recompra_pct": 0.0, "clv_aprox": 0.0}
    una = int((df["frequency"] == 1).sum())
    rec = int((df["frequency"] >= 2).sum())
    total = len(df)
    return {
        "clientes_unicos": total,
        "una_compra": una,
        "recurrentes": rec,
        "tasa_recompra_pct": round(rec / total * 100, 2),
        "clv_aprox": round(df["monetary"].sum() / total, 2),
    }
