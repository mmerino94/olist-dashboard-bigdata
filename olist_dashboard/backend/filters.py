"""Filtros globales compartidos entre endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from fastapi import Query


@dataclass
class Filters:
    desde: date | None = None
    hasta: date | None = None
    region: str | None = None
    categoria: str | None = None
    estado_pedido: str = "delivered"  # default: solo pedidos entregados
    meses: list[str] | None = None    # lista de meses YYYY-MM a incluir (checklist)


def filter_dep(
    desde: date | None = Query(None, description="YYYY-MM-DD"),
    hasta: date | None = Query(None, description="YYYY-MM-DD"),
    region: str | None = Query(None, description="Norte/Nordeste/Sudeste/Sur/Centro-Oeste"),
    categoria: str | None = Query(None),
    estado_pedido: str = Query("delivered", description="delivered (default) o 'all'"),
    meses: str | None = Query(None, description="lista de meses YYYY-MM separados por coma"),
) -> Filters:
    meses_list = [m.strip() for m in meses.split(",") if m.strip()] if meses else None
    return Filters(desde=desde, hasta=hasta, region=region,
                   categoria=categoria, estado_pedido=estado_pedido, meses=meses_list)


def where_clause(f: Filters, alias_fact: str = "f", alias_geo_cli: str = "geoc",
                 alias_producto: str = "p") -> tuple[str, dict]:
    """Construye el WHERE y params para queries que ya hicieron los joins necesarios."""
    conditions = []
    params: dict = {}
    if f.estado_pedido and f.estado_pedido != "all":
        conditions.append(f"{alias_fact}.estado_pedido = :estado_pedido")
        params["estado_pedido"] = f.estado_pedido
    if f.desde:
        conditions.append(f"{alias_fact}.id_tiempo >= :id_tiempo_desde")
        params["id_tiempo_desde"] = int(f.desde.strftime("%Y%m%d"))
    if f.hasta:
        conditions.append(f"{alias_fact}.id_tiempo <= :id_tiempo_hasta")
        params["id_tiempo_hasta"] = int(f.hasta.strftime("%Y%m%d"))
    if f.region:
        conditions.append(f"{alias_geo_cli}.region = :region")
        params["region"] = f.region
    if f.categoria:
        conditions.append(f"{alias_producto}.categoria = :categoria")
        params["categoria"] = f.categoria
    if f.meses:
        # YYYY-MM → YYYYMM (id_tiempo/100 da el mes del pedido)
        placeholders = []
        for i, ym in enumerate(f.meses):
            y, mo = ym.split("-")
            key = f"mes_{i}"
            placeholders.append(f":{key}")
            params[key] = int(y) * 100 + int(mo)
        conditions.append(f"({alias_fact}.id_tiempo / 100) IN ({', '.join(placeholders)})")
    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    return where, params
