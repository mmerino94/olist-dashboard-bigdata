"""Conexión a SQL Server (OlistDW)."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "etl"))
from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER  # noqa: E402

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = f"mssql+pymssql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=UTF-8"
        _engine = create_engine(url, pool_pre_ping=True, pool_size=5)
    return _engine


def query(sql: str, params: dict | None = None) -> pd.DataFrame:
    with get_engine().connect() as conn:
        return pd.read_sql(text(sql), conn, params=params or {})
