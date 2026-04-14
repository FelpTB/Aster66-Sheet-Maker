# -*- coding: utf-8 -*-
"""Gera catalog.js a partir de Cartas/*.md e Condições/*.html. Executar na raiz do projeto: python app/build_catalog.py"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TP(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, t, a):
        if t in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, t):
        if t in ("script", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, d):
        if self.skip:
            return
        d = d.strip()
        if d:
            self.parts.append(d)

    def text(self):
        return re.sub(r"\s+", " ", " ".join(self.parts)).strip()


def strip_html(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    p = TP()
    p.feed(raw)
    return p.text()


def main():
    origens_set = set()
    skills = []

    for p in sorted(ROOT.joinpath("Cartas").glob("*.md")):
        text = p.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        nome = lines[0].lstrip("#").strip() if lines else p.stem

        def get(key: str) -> str:
            for line in lines:
                if line.lower().startswith(key.lower()):
                    return line.split(":", 1)[-1].strip()
            return ""

        orig_raw = get("Origem")
        tipo = get("Tipo")
        custo = get("Custo")
        modo = get("Modo de Uso")
        tempo = get("Tempo de Uso")
        alc = get("Alcançe") or get("Alcance")
        origens = [x.strip() for x in re.split(r"[,;]", orig_raw) if x.strip()]
        for o in origens:
            origens_set.add(o)

        body = []
        skip_prefixes = (
            "custo:",
            "modo de uso",
            "origem:",
            "tipo:",
            "tempo de uso",
            "alcan",
            "alcance",
        )
        started = False
        for line in lines[1:]:
            t = line.strip()
            if not t:
                if started:
                    break
                continue
            low = t.lower()
            if any(low.startswith(sk) for sk in skip_prefixes):
                continue
            started = True
            body.append(t)
        desc = " ".join(body).strip()[:600]
        sid = re.sub(r"[^a-zA-Z0-9_-]+", "-", p.stem.lower()).strip("-")[:120]
        skills.append(
            {
                "id": sid,
                "nome": nome,
                "tipo": tipo,
                "origens": origens,
                "custo": custo,
                "modo": modo,
                "tempo": tempo,
                "alcance": alc,
                "descricao": desc,
            }
        )

    data_js = ROOT.joinpath("app/data.js").read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"origens:\s*\[([^\]]+)\]", data_js):
        inner = m.group(1)
        for q in re.findall(r'"([^"]+)"', inner):
            origens_set.add(q)

    origens_sorted = sorted(origens_set, key=lambda x: (x.lower(), x))

    cond_dir = ROOT / "Private & Shared" / "Guia do Jogador" / "Listas" / "Condições"
    conds = []
    seen = set()
    for p in sorted(cond_dir.glob("*.html")):
        name = re.sub(r"\s+[a-f0-9]{32}$", "", p.stem, flags=re.I)
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        t = strip_html(p)
        desc = t
        if desc.lower().startswith(name.lower()):
            desc = desc[len(name) :].strip()
        low = desc.lower()
        ac = "acúmulo" in low or "acumulo" in low or "acúmulos" in low
        cid = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        conds.append(
            {"id": cid, "nome": name, "descricao": desc[:900], "permiteAcumulo": ac}
        )

    conds.sort(key=lambda x: x["nome"].lower())

    out = ROOT / "app" / "catalog.js"
    payload = {
        "origens": origens_sorted,
        "habilidades": skills,
        "condicoes": conds,
    }
    out.write_text(
        "window.CATALOG = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print("origens", len(origens_sorted), "habilidades", len(skills), "condicoes", len(conds))
    print("written", out, "bytes", out.stat().st_size)


if __name__ == "__main__":
    main()
