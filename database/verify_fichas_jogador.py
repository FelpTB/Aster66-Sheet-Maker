"""Lista tabelas e funcoes do schema fichas_jogador."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent


def load_database_url() -> str:
    raw = (ROOT / ".env").read_text(encoding="utf-8")
    m = re.search(r"^DATABASE_URL=(.+)$", raw.strip(), re.MULTILINE)
    if not m:
        sys.exit("DATABASE_URL nao encontrado")
    url = m.group(1).strip().strip('"').strip("'")
    if "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


def main() -> None:
    url = load_database_url()
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'fichas_jogador'
                ORDER BY table_name
                """
            )
            tables = [r[0] for r in cur.fetchall()]
            cur.execute(
                """
                SELECT proname FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'fichas_jogador'
                ORDER BY proname
                """
            )
            funcs = [r[0] for r in cur.fetchall()]
        print("Tabelas:", len(tables))
        for t in tables:
            print(" ", t)
        print("Funcoes:", len(funcs))
        for f in funcs:
            print(" ", f)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
