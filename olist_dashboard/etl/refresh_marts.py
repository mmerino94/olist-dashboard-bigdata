"""
refresh_marts.py — Orquestador del refresh completo de la capa Data Mart.

Ejecuta en orden:
    1. mart_schema.sql                  (DROP + CREATE de las 7 tablas mart)
    2. refresh_p1_rentabilidad.sql      (carga P1)
    3. refresh_p2_rfm.sql               (carga P2)
    4. refresh_p3_logistica.sql         (carga P3)
    5. refresh_p4_vendedores.sql        (carga P4)
    6. refresh_p5_satisfaccion.sql      (carga sub-tablas 1 y 2 de P5)
    7. cargar_palabras_p5.py            (carga sub-tabla 3 de P5 — NLP en Python)

Idempotente: re-ejecutar deja la BD en el mismo estado.
Tiempo total esperado: ~15-30 segundos.

Uso:
    python etl/refresh_marts.py
"""
import sys
import time
import subprocess
from pathlib import Path
import pymssql

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_DIR       = PROJECT_ROOT / "db"
SQL_DIR      = PROJECT_ROOT / "sql"
ETL_DIR      = PROJECT_ROOT / "etl"
VENV_PYTHON  = PROJECT_ROOT / ".venv" / "bin" / "python"

# Lista ordenada de archivos SQL a ejecutar
ARCHIVOS_SQL = [
    DB_DIR / "mart_schema.sql",
    SQL_DIR / "refresh_p1_rentabilidad.sql",
    SQL_DIR / "refresh_p2_rfm.sql",
    SQL_DIR / "refresh_p3_logistica.sql",
    SQL_DIR / "refresh_p4_vendedores.sql",
    SQL_DIR / "refresh_p5_satisfaccion.sql",
]

# Script Python adicional para la sub-tabla 3 de P5
SCRIPT_PYTHON_PALABRAS = ETL_DIR / "cargar_palabras_p5.py"


def log(msg, indent=0):
    prefix = "  " * indent
    print(f"[{time.strftime('%H:%M:%S')}] {prefix}{msg}", flush=True)


def ejecutar_sql(archivo: Path):
    """Ejecuta un archivo SQL contra OlistDW. Splittea por '\\nGO\\n' (igual que los smoke tests anteriores)."""
    if not archivo.exists():
        raise FileNotFoundError(f"Archivo SQL no existe: {archivo}")

    log(f"Ejecutando {archivo.name}...", indent=1)
    t0 = time.time()

    sql = archivo.read_text(encoding='utf-8')
    batches = [b.strip() for b in sql.split("\nGO\n") if b.strip()]

    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database=DB_NAME, autocommit=True)
    cur = conn.cursor()

    errores = []
    for i, batch in enumerate(batches, 1):
        try:
            cur.execute(batch)
            # Consumir todos los resultsets para liberar el cursor (SELECTs intermedios).
            while True:
                try:
                    cur.fetchall()
                except pymssql.OperationalError:
                    pass
                if not cur.nextset():
                    break
        except Exception as e:
            errores.append((i, str(e)))

    conn.close()
    dt = time.time() - t0

    if errores:
        log(f"❌ {archivo.name} → {len(errores)} error(es) en {len(batches)} batches ({dt:.2f}s)", indent=2)
        for i, msg in errores:
            log(f"  batch {i}: {msg[:200]}", indent=3)
        raise RuntimeError(f"Fallo al ejecutar {archivo.name}")

    log(f"✅ {archivo.name} OK ({len(batches)} batches, {dt:.2f}s)", indent=2)


def ejecutar_python_palabras():
    """Ejecuta cargar_palabras_p5.py como subprocess usando el venv del proyecto."""
    if not SCRIPT_PYTHON_PALABRAS.exists():
        raise FileNotFoundError(f"Script Python no existe: {SCRIPT_PYTHON_PALABRAS}")

    log(f"Ejecutando {SCRIPT_PYTHON_PALABRAS.name}...", indent=1)
    t0 = time.time()

    result = subprocess.run(
        [str(VENV_PYTHON), str(SCRIPT_PYTHON_PALABRAS)],
        capture_output=True, text=True, encoding='utf-8'
    )
    dt = time.time() - t0

    if result.returncode != 0:
        log(f"❌ {SCRIPT_PYTHON_PALABRAS.name} → returncode {result.returncode}", indent=2)
        print(result.stderr)
        raise RuntimeError(f"Fallo al ejecutar {SCRIPT_PYTHON_PALABRAS.name}")

    log(f"✅ {SCRIPT_PYTHON_PALABRAS.name} OK ({dt:.2f}s)", indent=2)
    # Imprimir output del script para visibilidad.
    for line in result.stdout.splitlines():
        log(line, indent=3)


def validar_conteos_finales():
    """Verifica que las 7 tablas mart tengan filas razonables después del refresh."""
    log("Validando conteos finales...", indent=1)
    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database=DB_NAME)
    cur = conn.cursor()
    cur.execute("""
        SELECT 'p1_rentabilidad_categoria'   AS tabla, COUNT(*) AS filas FROM mart.p1_rentabilidad_categoria   UNION ALL
        SELECT 'p2_rfm_clientes',                      COUNT(*)         FROM mart.p2_rfm_clientes             UNION ALL
        SELECT 'p3_rutas_problematicas',               COUNT(*)         FROM mart.p3_rutas_problematicas      UNION ALL
        SELECT 'p4_vendedores_scorecard',              COUNT(*)         FROM mart.p4_vendedores_scorecard     UNION ALL
        SELECT 'p5_distribucion_puntuacion',           COUNT(*)         FROM mart.p5_distribucion_puntuacion  UNION ALL
        SELECT 'p5_satisfaccion_por_mes',              COUNT(*)         FROM mart.p5_satisfaccion_por_mes     UNION ALL
        SELECT 'p5_palabras_frecuentes',               COUNT(*)         FROM mart.p5_palabras_frecuentes
    """)

    # Expectativas (rangos aceptables para tolerar variaciones).
    expectativas = {
        'p1_rentabilidad_categoria':   (60, 90),
        'p2_rfm_clientes':             (90_000, 95_000),
        'p3_rutas_problematicas':      (350, 600),
        'p4_vendedores_scorecard':     (3_000, 3_200),
        'p5_distribucion_puntuacion':  (5, 5),
        'p5_satisfaccion_por_mes':     (22, 28),
        'p5_palabras_frecuentes':      (700, 900),
    }

    todo_ok = True
    for tabla, filas in cur.fetchall():
        rango = expectativas.get(tabla, (0, 10_000_000))
        ok = rango[0] <= filas <= rango[1]
        marker = "✅" if ok else "⚠️"
        log(f"{marker} {tabla:<32} {filas:>8,} filas (esperado {rango[0]:,}-{rango[1]:,})", indent=2)
        if not ok:
            todo_ok = False

    conn.close()
    return todo_ok


def main():
    t0 = time.time()
    log("=" * 70)
    log("INICIO REFRESH COMPLETO DE LA CAPA DATA MART")
    log("=" * 70)

    # Paso 1: ejecutar los archivos SQL en orden.
    for archivo in ARCHIVOS_SQL:
        ejecutar_sql(archivo)

    # Paso 2: ejecutar el script Python de palabras frecuentes.
    ejecutar_python_palabras()

    # Paso 3: validación final.
    todo_ok = validar_conteos_finales()

    dt = time.time() - t0
    log("=" * 70)
    if todo_ok:
        log(f"✅ REFRESH COMPLETO OK en {dt:.1f}s")
    else:
        log(f"⚠️ REFRESH COMPLETO con conteos fuera de rango ({dt:.1f}s)")
        sys.exit(1)
    log("=" * 70)


if __name__ == "__main__":
    main()
