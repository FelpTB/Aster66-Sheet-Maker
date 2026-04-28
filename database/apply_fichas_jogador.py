"""Aplica database/schema_fichas_jogador.sql usando DATABASE_URL do .env na raiz do projeto."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
SQL_FILE = Path(__file__).resolve().parent / "schema_fichas_jogador.sql"


def load_database_url() -> str:
    raw = ENV.read_text(encoding="utf-8")
    m = re.search(r"^DATABASE_URL=(.+)$", raw.strip(), re.MULTILINE)
    if not m:
        sys.exit("DATABASE_URL nao encontrado em .env")
    url = m.group(1).strip().strip('"').strip("'")
    if "sslmode=" not in url:
        url = f"{url}{'&' if '?' in url else '?'}sslmode=require"
    return url


def main() -> None:
    url = load_database_url()
    sql = SQL_FILE.read_text(encoding="utf-8")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print("OK: schema fichas_jogador aplicado com sucesso.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
