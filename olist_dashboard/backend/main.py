"""Olist Dashboard — FastAPI backend.

Run: cd olist_dashboard && .venv/bin/uvicorn backend.main:app --reload --port 8000
"""
import math

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes import (
    filtros,
    p1_rentabilidad,
    p2_retencion,
    p3_logistica,
    p4_vendedores,
    p5_satisfaccion,
    resumen,
)


def _sanitize(o):
    """Convierte NaN/Inf → None (válido en JSON) recursivamente."""
    if isinstance(o, float):
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, dict):
        return {k: _sanitize(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_sanitize(v) for v in o]
    return o


class SafeJSONResponse(JSONResponse):
    """Respuesta JSON que tolera NaN/Inf (los serializa como null)."""

    def render(self, content) -> bytes:
        return super().render(_sanitize(content))


app = FastAPI(
    title="Olist Dashboard API",
    description="Backend que expone los KPIs de los 5 problemas de negocio "
                "del proyecto Big Data Analysis (dataset Olist).",
    version="0.1.0",
    default_response_class=SafeJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(filtros.router)
app.include_router(resumen.router)
app.include_router(p1_rentabilidad.router)
app.include_router(p2_retencion.router)
app.include_router(p3_logistica.router)
app.include_router(p4_vendedores.router)
app.include_router(p5_satisfaccion.router)


@app.get("/")
def root():
    return {
        "service": "Olist Dashboard API",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": [
            "/api/filtros",
            "/api/resumen/kpis",
            "/api/resumen/evolucion",
            "/api/p1/categorias",
            "/api/p1/forma_pago",
            "/api/p2/segmentos",
            "/api/p2/recompra",
            "/api/p3/kpis",
            "/api/p3/rutas",
            "/api/p3/satisfaccion_vs_retraso",
            "/api/p4/semaforo",
            "/api/p4/top",
            "/api/p5/distribucion",
            "/api/p5/evolucion",
            "/api/p5/palabras",
        ],
    }
