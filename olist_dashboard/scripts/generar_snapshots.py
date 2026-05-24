"""
generar_snapshots.py — Vuelca los 7 data marts a JSONs estáticos.

Los JSONs salen en olist_dashboard/frontend/public/data/ y son consumidos
por el dashboard React vía fetch() en cliente. No requiere backend en vivo.

Workflow:
    1. python etl/refresh_marts.py     (regenera mart.* desde dbo.*)
    2. python scripts/generar_snapshots.py  (este script — vuelca a JSON)
    3. (commit & push) → Vercel deploya automáticamente

Uso:
    python scripts/generar_snapshots.py
"""
import json
import sys
import time
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
import pymssql

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "etl"))
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Mapa de archivos JSON a generar. Cada entrada es:
#   (nombre_archivo_json, query_sql)
# La query devuelve los registros tal como quedarán en el JSON.
SNAPSHOTS = {
    "p1_rentabilidad_categoria.json": """
        SELECT
            ranking, categoria, items_vendidos, pedidos_distintos,
            ingreso_brl, ticket_promedio, pct_individual, pct_acumulado,
            flete_sobre_precio, rating_promedio, pct_resena_mala, pct_retraso,
            es_categoria_trampa, es_categoria_estrella
        FROM mart.p1_rentabilidad_categoria
        ORDER BY ranking
    """,

    "p2_rfm_segmentos.json": """
        SELECT
            segmento,
            COUNT(*) AS num_clientes,
            CAST(SUM(monto_total) AS DECIMAL(14,2)) AS ingreso_total,
            CAST(AVG(monto_total) AS DECIMAL(10,2)) AS gasto_promedio,
            CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS pct
        FROM mart.p2_rfm_clientes
        GROUP BY segmento
        ORDER BY num_clientes DESC
    """,

    "p2_rfm_matriz.json": """
        SELECT R, F, COUNT(*) AS num_clientes
        FROM mart.p2_rfm_clientes
        GROUP BY R, F
        ORDER BY R, F
    """,

    "p2_rfm_distribucion_f.json": """
        SELECT F, COUNT(*) AS num_clientes,
               MIN(num_pedidos) AS min_ped, MAX(num_pedidos) AS max_ped
        FROM mart.p2_rfm_clientes
        GROUP BY F ORDER BY F
    """,

    "p2_rfm_top_clientes.json": """
        SELECT TOP 20 customer_unique_id, num_pedidos, dias_recencia,
                      monto_total, R, F, M, segmento
        FROM mart.p2_rfm_clientes
        ORDER BY monto_total DESC
    """,

    "p3_rutas_problematicas.json": """
        SELECT estado_origen, estado_destino, region_origen, region_destino,
               es_intra_estado, total_envios,
               dias_promedio_entrega, dias_retraso_promedio,
               pct_a_tiempo, pct_retraso_critico,
               ingreso_brl, ranking_problemas
        FROM mart.p3_rutas_problematicas
        ORDER BY total_envios DESC
    """,

    "p4_vendedores_scorecard.json": """
        SELECT id_vendedor, estado_vendedor, region_vendedor,
               num_pedidos, num_items, ingreso_brl,
               rating_promedio, pct_a_tiempo, pct_cancelados,
               pct_resena_mala, semaforo, ranking_ingreso
        FROM mart.p4_vendedores_scorecard
        ORDER BY ranking_ingreso
    """,

    "p5_distribucion_puntuacion.json": """
        SELECT puntuacion, num_resenas, pct, pct_con_comentario
        FROM mart.p5_distribucion_puntuacion
        ORDER BY puntuacion
    """,

    "p5_satisfaccion_por_mes.json": """
        SELECT anio, mes, num_resenas, rating_promedio,
               pct_positivas, pct_negativas, nps_estimado
        FROM mart.p5_satisfaccion_por_mes
        ORDER BY anio, mes
    """,

    "p5_palabras_frecuentes.json": """
        SELECT palabra, n_gram, score_grupo, frecuencia
        FROM mart.p5_palabras_frecuentes
        ORDER BY score_grupo, n_gram, frecuencia DESC
    """,

    # KPIs agregados para Vista 0 (Resumen Ejecutivo)
    "resumen_kpis.json": """
        SELECT
            (SELECT CAST(SUM(ingreso_brl) AS DECIMAL(14,2))
             FROM mart.p1_rentabilidad_categoria)              AS ingreso_total,
            (SELECT COUNT(*) FROM mart.p1_rentabilidad_categoria) AS num_categorias,
            (SELECT COUNT(*) FROM mart.p1_rentabilidad_categoria
             WHERE es_categoria_trampa = 1)                    AS num_categorias_trampa,
            (SELECT TOP 1 categoria FROM mart.p1_rentabilidad_categoria
             ORDER BY ranking)                                 AS top_categoria,
            (SELECT TOP 1 pct_individual FROM mart.p1_rentabilidad_categoria
             ORDER BY ranking)                                 AS top_categoria_pct,
            (SELECT COUNT(*) FROM mart.p2_rfm_clientes)        AS total_clientes,
            (SELECT COUNT(*) FROM mart.p2_rfm_clientes
             WHERE num_pedidos = 1)                            AS clientes_one_time,
            (SELECT COUNT(*) FROM mart.p2_rfm_clientes
             WHERE segmento = N'Champions')                    AS clientes_champions,
            (SELECT COUNT(*) FROM mart.p3_rutas_problematicas) AS total_rutas,
            (SELECT SUM(total_envios)
             FROM mart.p3_rutas_problematicas)                 AS total_envios_delivered,
            (SELECT CAST(AVG(pct_a_tiempo) AS DECIMAL(5,2))
             FROM mart.p3_rutas_problematicas)                 AS pct_a_tiempo_global,
            (SELECT COUNT(*) FROM mart.p4_vendedores_scorecard)  AS total_vendedores,
            (SELECT COUNT(*) FROM mart.p4_vendedores_scorecard
             WHERE semaforo = N'Crítico')                      AS vendedores_criticos,
            (SELECT CAST(100.0 * SUM(CASE WHEN semaforo = N'Crítico' THEN ingreso_brl ELSE 0 END)
                        / SUM(ingreso_brl) AS DECIMAL(5,2))
             FROM mart.p4_vendedores_scorecard)                AS pct_ingreso_criticos,
            (SELECT pct FROM mart.p5_distribucion_puntuacion
             WHERE puntuacion = 5)                             AS pct_5_estrellas,
            (SELECT pct FROM mart.p5_distribucion_puntuacion
             WHERE puntuacion = 1)                             AS pct_1_estrella,
            (SELECT CAST(AVG(nps_estimado) AS DECIMAL(5,2))
             FROM mart.p5_satisfaccion_por_mes
             WHERE num_resenas >= 100)                         AS nps_promedio
    """,
}


def json_default(obj):
    """Convierte tipos no-serializables a JSON-friendly."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def main():
    t0 = time.time()
    log("=" * 70)
    log("GENERANDO SNAPSHOTS JSON DESDE mart.* → frontend/public/data/")
    log("=" * 70)

    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database=DB_NAME, as_dict=True)
    cur = conn.cursor()

    resumen = []
    for filename, sql in SNAPSHOTS.items():
        try:
            cur.execute(sql.strip())
            rows = cur.fetchall()
        except Exception as e:
            log(f"  ❌ {filename}: ERROR ejecutando query — {e}")
            continue

        output_path = OUTPUT_DIR / filename
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, default=json_default, indent=None)

        size_kb = output_path.stat().st_size / 1024
        resumen.append((filename, len(rows), size_kb))
        log(f"  ✅ {filename:<40} {len(rows):>6,} filas  ({size_kb:>7.1f} KB)")

    conn.close()

    log("=" * 70)
    log(f"OK — {len(resumen)} snapshots en {OUTPUT_DIR}")
    log(f"Tamaño total: {sum(s[2] for s in resumen):.1f} KB")
    log(f"Tiempo total: {time.time() - t0:.1f}s")
    log("=" * 70)


if __name__ == "__main__":
    main()
