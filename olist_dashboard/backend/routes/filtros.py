"""Catálogo de opciones para los filtros del dashboard."""
from fastapi import APIRouter

from db import query

router = APIRouter(prefix="/api/filtros", tags=["filtros"])


@router.get("")
def opciones():
    rango = query("""
        SELECT MIN(fecha) AS desde, MAX(fecha) AS hasta
        FROM DIM_TIEMPO
        WHERE id_tiempo IN (SELECT DISTINCT id_tiempo FROM FACT_VENTAS)
    """).iloc[0]
    regiones = query("SELECT DISTINCT region FROM DIM_GEOGRAFIA ORDER BY region")["region"].tolist()
    categorias = query("""
        SELECT TOP 30 p.categoria, COUNT(*) AS n
        FROM FACT_VENTAS f JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        WHERE p.categoria IS NOT NULL
        GROUP BY p.categoria ORDER BY n DESC
    """)["categoria"].tolist()
    estados = query("""
        SELECT estado_pedido, COUNT(*) AS n
        FROM FACT_VENTAS GROUP BY estado_pedido ORDER BY n DESC
    """)["estado_pedido"].tolist()
    return {
        "rango_fechas": {"desde": str(rango["desde"]), "hasta": str(rango["hasta"])},
        "regiones": regiones,
        "categorias": categorias,
        "estados_pedido": estados,
    }
