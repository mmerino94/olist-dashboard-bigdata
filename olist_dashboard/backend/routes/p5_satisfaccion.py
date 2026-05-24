"""P5: Satisfacción del cliente, NPS y análisis de texto."""
import re
from collections import Counter

from fastapi import APIRouter, Depends, Query

from db import query
from filters import Filters, filter_dep, where_clause

router = APIRouter(prefix="/api/p5", tags=["p5-satisfaccion"])

STOPWORDS_PT = {
    "de", "da", "do", "e", "o", "a", "que", "na", "no", "para", "com",
    "muito", "mais", "foi", "uma", "um", "em", "por", "os", "as", "não",
    "ja", "já", "ate", "até", "mas", "ele", "ela", "isso", "tem", "ser",
    "este", "esta", "esse", "essa", "como", "tudo", "veio", "foi", "sou",
    "minha", "meu", "fui", "estou", "estava", "muito", "mesmo", "todo",
    "todos", "toda", "todas", "esta", "esse", "tava", "tem", "ter",
    "produto", "comprei", "comprar", "compra",
}


def _comment_join(f: Filters, only_negative: bool, only_positive: bool = False) -> str:
    where, params = where_clause(f)
    cond = []
    if only_negative:
        cond.append("r.puntuacion_review <= 2")
    if only_positive:
        cond.append("r.puntuacion_review = 5")
    cond_extra = (" AND " + " AND ".join(cond)) if cond else ""
    sql = f"""
        SELECT r.comentario_texto
        FROM FACT_VENTAS f
        JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        AND r.escribio_comentario = 1
        {cond_extra}
    """
    return query(sql, params)["comentario_texto"].dropna().tolist()


@router.get("/distribucion")
def distribucion(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            r.puntuacion_review AS score,
            r.satisfaccion,
            COUNT(*) AS n
        FROM FACT_VENTAS f
        JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY r.puntuacion_review, r.satisfaccion
        ORDER BY r.puntuacion_review
    """
    df = query(sql, params)
    total = df["n"].sum() or 1
    df["pct"] = (df["n"] / total * 100).round(2)
    promotores = df.loc[df["score"] == 5, "n"].sum()
    detractores = df.loc[df["score"].isin([1, 2]), "n"].sum()
    nps = round(100 * (promotores - detractores) / total, 1)
    return {
        "distribucion": df.to_dict(orient="records"),
        "nps_estimado": nps,
        "total_resenas": int(total),
    }


@router.get("/evolucion")
def evolucion(f: Filters = Depends(filter_dep)):
    where, params = where_clause(f)
    sql = f"""
        SELECT
            t.anio, t.mes,
            ROUND(AVG(CAST(r.puntuacion_review AS DECIMAL(3,2))), 2) AS rating,
            COUNT(*) AS resenas,
            ROUND(100.0 * SUM(CASE WHEN r.satisfaccion = 'Mala' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_malas
        FROM FACT_VENTAS f
        JOIN DIM_RESENA r ON f.id_pedido = r.id_pedido
        JOIN DIM_TIEMPO t ON f.id_tiempo = t.id_tiempo
        LEFT JOIN DIM_GEOGRAFIA geoc ON f.id_geografia_cli = geoc.id_geografia
        LEFT JOIN DIM_PRODUCTO p ON f.id_producto = p.id_producto
        {where}
        GROUP BY t.anio, t.mes
        ORDER BY t.anio, t.mes
    """
    df = query(sql, params)
    df["periodo"] = df["anio"].astype(str) + "-" + df["mes"].astype(str).str.zfill(2)
    return df.to_dict(orient="records")


@router.get("/palabras")
def palabras_frecuentes(
    f: Filters = Depends(filter_dep),
    tipo: str = Query("negativas", description="negativas | positivas"),
    top: int = Query(20, ge=5, le=50),
):
    msgs = _comment_join(f, only_negative=(tipo == "negativas"),
                         only_positive=(tipo == "positivas"))
    counter: Counter[str] = Counter()
    for msg in msgs:
        for tok in re.findall(r"[A-Za-zÀ-ÿ]{4,}", str(msg).lower()):
            if tok not in STOPWORDS_PT:
                counter[tok] += 1
    return [{"termino": w, "frecuencia": c}
            for w, c in counter.most_common(top)]
