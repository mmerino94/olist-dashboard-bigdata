"""
cargar_palabras_p5.py — Cálculo de mart.p5_palabras_frecuentes.

Procesa comentario_texto de DIM_RESENA, tokeniza, filtra stopwords PT+ES,
genera unigramas y bigramas, y los inserta en el data mart agrupados por
score_grupo ('positiva' / 'negativa').

Universo:
    - SOLO reseñas con comentario_texto NOT NULL.
    - SOLO puntuaciones 1-2 (negativa) y 4-5 (positiva). Excluye puntuación 3.

Salida:
    mart.p5_palabras_frecuentes con N filas por (palabra, n_gram, score_grupo).
"""
import re
import sys
import time
from collections import Counter
from pathlib import Path
import pymssql

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

# Parámetros (ajustar si quieres más/menos palabras en el dashboard)
TOP_N_POR_GRUPO_Y_NGRAM = 200   # top 200 unigramas + top 200 bigramas por grupo
MIN_FRECUENCIA = 3              # filtrar palabras que aparecen <3 veces (ruido)
LONGITUD_MIN_PALABRA = 3        # ignorar palabras de 1-2 caracteres

# Stopwords portugués (lista base curada para reseñas de e-commerce brasileño)
STOPWORDS_PT = {
    'a','o','as','os','um','uma','uns','umas','de','do','da','dos','das',
    'em','no','na','nos','nas','por','para','com','sem','sob','sobre','até',
    'e','ou','mas','que','se','não','nao','sim','ja','já','ainda','muito',
    'mais','menos','muita','muitas','muitos','meu','minha','meus','minhas',
    'seu','sua','seus','suas','este','esta','estes','estas','esse','essa',
    'esses','essas','aquele','aquela','aqueles','aquelas','isto','isso',
    'aquilo','eu','tu','ele','ela','nós','nos','vós','eles','elas','me','te',
    'lhe','lhes','meu','teu','quando','como','onde','porque','pois','também',
    'foi','ser','sou','é','são','era','eram','estou','está','estão','estava',
    'estavam','tenho','tem','tinha','tinham','ter','vou','vai','vamos','irá',
    'fica','ficou','fazendo','fez','feito','feita','dia','dias','hoje','ontem',
    'amanhã','agora','antes','depois','já','sempre','nunca','aqui','ali','lá',
    'cá','assim','então','mesmo','mesma','outro','outra','outros','outras',
    'todo','toda','todos','todas','qualquer','cada','muito','pouco','bom','boa',
    'ruim','grande','pequeno','novo','nova',
}

# Stopwords español (lista base curada)
STOPWORDS_ES = {
    'a','el','la','los','las','un','una','unos','unas','de','del','en','y','o',
    'pero','que','si','no','sí','muy','más','menos','mi','mis','tu','tus','su',
    'sus','nuestro','nuestra','nuestros','nuestras','vuestro','vuestra','este',
    'esta','estos','estas','ese','esa','esos','esas','aquel','aquella','aquellos',
    'aquellas','esto','eso','aquello','yo','tú','él','ella','nosotros','vosotros',
    'ellos','ellas','me','te','se','le','les','lo','les','mi','ti','si','con',
    'sin','por','para','hasta','desde','sobre','bajo','tras','según','contra',
    'ante','entre','durante','mediante','soy','eres','es','somos','sois','son',
    'era','eras','éramos','erais','eran','fui','fue','fuimos','tengo','tienes',
    'tiene','tenemos','tienen','tenía','tenían','voy','vas','va','vamos','van',
    'hacer','hago','hace','hicimos','hicieron','hecho','hace','muy','también',
    'tanto','tan','así','aquí','ahí','allí','allá','hoy','ayer','mañana','ya',
    'aún','todavía','siempre','nunca','jamás','bien','mal','poco','mucho','mejor',
    'peor','bueno','buena','malo','mala',
}

# Stopwords específicas del contexto (no aportan a "qué dicen")
STOPWORDS_CONTEXTUALES = {
    'produto','produtos','compra','recebi','recebido','chegou','comprei',
    'pedido','entrega','entregue','entregaram','vendedor','loja','recomendo',
    'comprar','site','olist','obrigado','obrigada','parabens','parabéns',
}

STOPWORDS_ALL = STOPWORDS_PT | STOPWORDS_ES | STOPWORDS_CONTEXTUALES

# Caracteres permitidos en tokens: letras (con acentos)
TOKEN_RE = re.compile(r"[a-záàâãéêíóôõúüçñ]+", re.IGNORECASE)


def tokenizar(texto: str) -> list[str]:
    """Lowercase + regex de letras + filtro de stopwords y longitud mínima."""
    if not texto:
        return []
    texto = texto.lower()
    tokens = TOKEN_RE.findall(texto)
    return [
        t for t in tokens
        if len(t) >= LONGITUD_MIN_PALABRA and t not in STOPWORDS_ALL
    ]


def generar_bigramas(tokens: list[str]) -> list[str]:
    """Pares consecutivos como 'palabra1 palabra2'."""
    return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def main():
    t0 = time.time()
    log("Conectando a OlistDW...")
    conn = pymssql.connect(server=DB_HOST, port=DB_PORT, user=DB_USER,
                           password=DB_PASSWORD, database=DB_NAME, autocommit=True)
    cur = conn.cursor()

    log("Leyendo reseñas con comentario (puntuacion 1-2 o 4-5)...")
    cur.execute("""
        SELECT puntuacion_review, comentario_texto
        FROM dbo.DIM_RESENA
        WHERE comentario_texto IS NOT NULL
          AND LEN(comentario_texto) > 0
          AND puntuacion_review IN (1, 2, 4, 5)
    """)
    rows = cur.fetchall()
    log(f"  {len(rows):,} reseñas con comentario leídas.")

    # Tokenizar y agrupar
    log("Tokenizando y agrupando...")
    counters = {
        ('negativa', 1): Counter(),
        ('negativa', 2): Counter(),
        ('positiva', 1): Counter(),
        ('positiva', 2): Counter(),
    }
    for punt, texto in rows:
        grupo = 'negativa' if punt <= 2 else 'positiva'
        tokens = tokenizar(texto)
        counters[(grupo, 1)].update(tokens)
        counters[(grupo, 2)].update(generar_bigramas(tokens))

    # Aplicar TRUNCATE + filtros y armar batch INSERT
    log("TRUNCATE mart.p5_palabras_frecuentes...")
    cur.execute("TRUNCATE TABLE mart.p5_palabras_frecuentes")

    batch = []
    for (grupo, n_gram), counter in counters.items():
        # Filtrar por frecuencia mínima y tomar top N
        filtered = [(p, f) for p, f in counter.most_common() if f >= MIN_FRECUENCIA]
        top = filtered[:TOP_N_POR_GRUPO_Y_NGRAM]
        log(f"  ({grupo}, {n_gram}-gram): {len(counter):,} únicos → "
            f"{len(filtered):,} ≥{MIN_FRECUENCIA} → top {len(top)}")
        for palabra, freq in top:
            # Truncar palabras muy largas (defensa contra el límite NVARCHAR(120))
            if len(palabra) > 120:
                palabra = palabra[:120]
            batch.append((palabra, n_gram, grupo, freq))

    log(f"INSERT batch de {len(batch):,} filas...")
    cur.executemany(
        "INSERT INTO mart.p5_palabras_frecuentes (palabra, n_gram, score_grupo, frecuencia) "
        "VALUES (%s, %s, %s, %d)",
        batch
    )

    log(f"Validación final: SELECT COUNT(*) FROM mart.p5_palabras_frecuentes")
    cur.execute("SELECT COUNT(*) FROM mart.p5_palabras_frecuentes")
    total = cur.fetchone()[0]
    log(f"  Total filas en mart: {total:,}")

    conn.close()
    log(f"OK total: {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
