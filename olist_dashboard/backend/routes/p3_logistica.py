"""P3: Tiempos de entrega y rutas logísticas."""
from fastapi import APIRouter, Depends

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/p3", tags=["p3-logistica"])


@router.get("/rutas")
def rutas(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            geov.estado AS origen,
            geoc.estado AS destino,
            geov.region AS origen_region,
            geoc.region AS destino_region,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(8,2))), 1) AS dias_entrega_avg,
            ROUND(AVG(CAST(f.dias_retraso AS DECIMAL(8,2))), 1) AS retraso_avg,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual,
            ROUND(100.0 * SUM(CASE WHEN f.dias_retraso > 7 THEN 1 ELSE 0 END) /
                  NULLIF(COUNT(*), 0), 1) AS pct_retraso_critico
        FROM FACT_VENTAS f
        JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        JOIN DIM_GEOGRAFIA geov ON f.id_geografia_ven = geov.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY geov.estado, geoc.estado, geov.region, geoc.region
        HAVING COUNT(DISTINCT f.id_pedido) >= 20
        ORDER BY retraso_avg DESC
    """
    return query(sql, params).to_dict(orient="records")


@router.get("/satisfaccion_vs_retraso")
def satisfaccion_vs_retraso(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            CASE
                WHEN f.dias_retraso <= 0 THEN '0. A tiempo'
                WHEN f.dias_retraso <= 3 THEN '1. 1-3 días'
                WHEN f.dias_retraso <= 7 THEN '2. 4-7 días'
                WHEN f.dias_retraso <= 14 THEN '3. 8-14 días'
                ELSE '4. >14 días'
            END AS bucket_retraso,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating_avg,
            ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) /
                  NULLIF(COUNT(r.id_resena), 0), 1) AS pct_malas
        FROM FACT_VENTAS f
        LEFT JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        AND f.dias_retraso IS NOT NULL
        GROUP BY
            CASE
                WHEN f.dias_retraso <= 0 THEN '0. A tiempo'
                WHEN f.dias_retraso <= 3 THEN '1. 1-3 días'
                WHEN f.dias_retraso <= 7 THEN '2. 4-7 días'
                WHEN f.dias_retraso <= 14 THEN '3. 8-14 días'
                ELSE '4. >14 días'
            END
        ORDER BY bucket_retraso
    """
    return query(sql, params).to_dict(orient="records")


@router.get("/kpis")
def kpis_entrega(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(8,2))), 1) AS tiempo_promedio,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual,
            ROUND(AVG(CASE WHEN f.dias_retraso > 0 THEN CAST(f.dias_retraso AS DECIMAL(8,2)) END), 1) AS retraso_avg_atrasados,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.dias_retraso > 7 THEN f.id_pedido END) /
                  NULLIF(COUNT(DISTINCT f.id_pedido), 0), 1) AS pct_retraso_critico
        FROM FACT_VENTAS f
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
    """
    return query(sql, params).iloc[0].to_dict()


@router.get("/intra_inter")
def intra_inter(f: Filters = Depends(filter_dep)):
    """Compara pedidos dentro del mismo estado (vendedor=cliente) vs entre estados."""
    where, params = where_clause(f)
    sql = f"""
        SELECT
            CASE WHEN geov.estado = geoc.estado THEN 'Intra-estado' ELSE 'Inter-estado' END AS tipo,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(f.dias_hasta_entrega AS DECIMAL(8,2))), 1) AS dias_entrega_avg,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.dias_retraso > 7 THEN f.id_pedido END)
                  / NULLIF(COUNT(DISTINCT f.id_pedido), 0), 1) AS pct_retraso_critico
        FROM FACT_VENTAS f
        JOIN DIM_GEOGRAFIA geov ON f.id_geografia_ven = geov.id_geografia
        JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY CASE WHEN geov.estado = geoc.estado THEN 'Intra-estado' ELSE 'Inter-estado' END
    """
    return query(sql, params).to_dict(orient="records")


@router.get("/regiones")
def retraso_por_region(f: Filters = Depends(filter_dep)):
    """Retraso y puntualidad agregados por región de destino (cliente)."""
    where, params = where_clause(f)
    sql = f"""
        SELECT
            geoc.region AS region,
            COUNT(DISTINCT f.id_pedido) AS pedidos,
            ROUND(AVG(CAST(f.dias_retraso AS DECIMAL(8,2))), 1) AS retraso_avg,
            ROUND(AVG(CAST(f.entrego_a_tiempo AS DECIMAL(5,2))) * 100, 1) AS pct_puntual
        FROM FACT_VENTAS f
        JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY geoc.region
        ORDER BY retraso_avg DESC
    """
    return query(sql, params).to_dict(orient="records")
