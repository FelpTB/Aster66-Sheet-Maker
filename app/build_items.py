# -*- coding: utf-8 -*-
"""Gera items.js a partir de Private & Shared/.../Itens/Itens/*.html. Executar: python app/build_items.py"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ITEMS_DIR = ROOT / "Private & Shared" / "Guia do Jogador" / "Listas" / "Itens" / "Itens"


class StripTags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, d):
        t = d.strip()
        if t:
            self.parts.append(t)

    def text(self):
        return re.sub(r"\s+", " ", " ".join(self.parts)).strip()


def td_text(s: str) -> str:
    p = StripTags()
    p.feed(s)
    return p.text()


def parse_properties_block(raw: str) -> dict:
    props = {}
    for m in re.finditer(
        r'<tr class="property-row[^"]*"[^>]*>\s*<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>',
        raw,
        re.DOTALL | re.IGNORECASE,
    ):
        key = td_text(m.group(1))
        val = td_text(m.group(2))
        if key:
            props[key] = val
    return props


def body_paragraphs(raw: str) -> str:
    m = re.search(r'<div class="page-body"[^>]*>(.*?)</article>', raw, re.DOTALL | re.IGNORECASE)
    if not m:
        return ""
    inner = m.group(1)
    parts = []
    for pm in re.finditer(r'<p[^>]*>(.*?)</p>', inner, re.DOTALL | re.IGNORECASE):
        t = td_text(pm.group(1))
        if t:
            parts.append(t)
    return " ".join(parts)[:1200]


def main():
    if not ITEMS_DIR.is_dir():
        print("Pasta não encontrada:", ITEMS_DIR)
        return

    itens = []
    for p in sorted(ITEMS_DIR.glob("*.html")):
        raw = p.read_text(encoding="utf-8", errors="replace")
        hex_m = re.search(r"([a-f0-9]{32})\.html$", p.name, re.I)
        item_id = "it-" + hex_m.group(1) if hex_m else re.sub(r"[^a-z0-9]+", "-", p.stem.lower()).strip("-")[:80]

        title_m = re.search(r'class="page-title"[^>]*dir="auto"[^>]*>([^<]+)', raw)
        nome = (title_m.group(1) if title_m else p.stem).strip()
        nome = re.sub(r"\s+[a-f0-9]{32}$", "", nome, flags=re.I).strip()

        props = parse_properties_block(raw)
        qtd_esp = props.get("Qtd. por espaço", "1")
        try:
            qtd_por_espaco = max(1, int(float(str(qtd_esp).replace(",", "."))))
        except ValueError:
            qtd_por_espaco = 1

        itens.append(
            {
                "id": item_id,
                "nome": nome,
                "tipo": props.get("Tipo", ""),
                "alcance": props.get("Alcançe", "") or props.get("Alcance", ""),
                "empunhadura": props.get("Empunhadura", ""),
                "habilidade": props.get("Habilidade", ""),
                "preco": props.get("Preço Unitário", ""),
                "qtdPorEspaco": qtd_por_espaco,
                "tempoUso": props.get("Tempo de Uso", ""),
                "descricao": body_paragraphs(raw),
            }
        )

    itens.sort(key=lambda x: x["nome"].lower())
    out = ROOT / "app" / "items.js"
    out.write_text(
        "window.ITEMS_CATALOG = " + json.dumps({"itens": itens}, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print("itens", len(itens), "written", out, "bytes", out.stat().st_size)


if __name__ == "__main__":
    main()
