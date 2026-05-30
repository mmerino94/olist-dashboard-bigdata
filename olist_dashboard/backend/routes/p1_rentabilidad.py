"""P1: Rentabilidad por categoría."""
import numpy as np
from fastapi import APIRouter, Depends

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/p1", tags=["p1-rentabilidad"])


@router.get("/categorias")
def ranking_categorias(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            p.categoria,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            COUNT(*) AS unidades_vendidas,
            COUNT(DISTINCT f.id_producto) AS productos_distintos,
            ROUND(SUM(f.valor_total), 0) AS ingreso_total,
            ROUND(SUM(f.flete), 0) AS flete_total,
            ROUND(SUM(f.valor_total) / NULLIF(COUNT(DISTINCT f.id_pedido), 0), 2) AS ticket_promedio,
            ROUND(AVG(f.flete_sobre_precio), 1) AS flete_pct,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual,
            ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) /
                  NULLIF(COUNT(r.id_resena), 0), 1) AS pct_resenas_malas
        FROM FACT_VENTAS f
        JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        {where}
        AND p.categoria IS NOT NULL
        GROUP BY p.categoria
        ORDER BY ingreso_total DESC
    """
    df = query(sql, params)
    total = df["ingreso_total"].sum()
    df["pct_ingreso"] = (df["ingreso_total"] / total * 100).round(2) if total else 0.0
    df["pct_acumulado"] = df["pct_ingreso"].cumsum().round(2)
    df["pareto"] = df["pct_acumulado"].apply(lambda x: "Core 80%" if x <= 80 else "Long Tail")
    return df.to_dict(orient="records")


@router.get("/productos_retirar")
def productos_retirar(f: Filters = Depends(filter_dep), top: int = 15):
    """Productos candidatos a retirar: bajo ingreso + alta insatisfacción.

    Score = pct_resenas_malas / LOG(ingreso). Mayor score → más candidato a retirar.
    Filtramos a productos con al menos 10 pedidos para evitar ruido estadístico.
    """
    where, params = where_clause(f)
    sql = f"""
        WITH base AS (
            SELECT
                f.id_producto,
                p.categoria,
                COUNT(DISTINCT f.id_pedido) AS pedidos,
                COUNT(*) AS unidades,
                ROUND(SUM(f.valor_total), 0) AS ingresos,
                ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) /
                      NULLIF(COUNT(r.id_resena), 0), 1) AS pct_resenas_malas,
                ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating_avg
            FROM FACT_VENTAS f
            JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
            LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
            LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
            {where}
            GROUP BY f.id_producto, p.categoria
            HAVING COUNT(DISTINCT f.id_pedido) >= 10
               AND COUNT(r.id_resena) >= 5
        )
        SELECT TOP (:top)
            id_producto,
            categoria,
            pedidos,
            unidades,
            ingresos,
            pct_resenas_malas,
            rating_avg,
            ROUND(pct_resenas_malas / NULLIF(LOG(ingresos + 1), 0), 2) AS score_retiro
        FROM base
        WHERE pct_resenas_malas >= 30
        ORDER BY pct_resenas_malas DESC, ingresos ASC
    """
    params["top"] = top
    df = query(sql, params).replace({np.nan: None})
    return df.to_dict(orient="records")


@router.get("/forma_pago")
def forma_pago(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            dp.tipo_pago,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(dp.num_cuotas AS DECIMAL(5,2))), 1) AS cuotas_promedio,
            ROUND(SUM(f.valor_total), 0) AS ingreso_total,
            ROUND(SUM(f.valor_total) / NULLIF(COUNT(DISTINCT f.id_pedido), 0), 2) AS ticket_promedio
        FROM FACT_VENTAS f
        JOIN DIM_PAGO dp ON f.id_pago = dp.id_pago
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY dp.tipo_pago
        ORDER BY ingreso_total DESC
    """
    return query(sql, params).to_dict(orient="records")
