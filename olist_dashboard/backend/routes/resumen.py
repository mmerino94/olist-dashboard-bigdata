"""Resumen ejecutivo: KPIs principales y series temporales."""
from fastapi import APIRouter, Depends

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/resumen", tags=["resumen"])


@router.get("/kpis")
def kpis(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(SUM(f.valor_total), 0) AS ingreso_total,
            ROUND(SUM(f.valor_total) / NULLIF(COUNT(DISTINCT f.id_pedido), 0), 2) AS ticket_promedio,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual,
            ROUND(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(8,2))), 1) AS dias_entrega_promedio,
            ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating_promedio,
            ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) /
                  NULLIF(COUNT(r.id_resena), 0), 1) AS pct_resenas_malas
        FROM FACT_VENTAS f
        LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
    """
    return query(sql, params).iloc[0].to_dict()


@router.get("/evolucion")
def evolucion_mensual(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            t.anio, t.mes,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(SUM(f.valor_total), 0) AS ingreso,
            ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating
        FROM FACT_VENTAS f
        JOIN DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
        LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY t.anio, t.mes
        ORDER BY t.anio, t.mes
    """
    df = query(sql, params)
    df["periodo"] = df["anio"].astype(str) + "-" + df["mes"].astype(str).str.zfill(2)
    return df.to_dict(orient="records")
