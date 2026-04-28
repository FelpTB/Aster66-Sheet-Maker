/**
 * Regras derivadas do GUIA_REGRAS.md (seções 6–9 e 11).
 * Centralizado para troca futura (Lovable) sem acoplar à UI.
 */

export type AttrKey =
  | "corpo"
  | "mente"
  | "alma"
  | "destreza"
  | "conhecimento"
  | "foco";

/** Teto dos seis atributos na ficha base (antes de bônus de cartas/itens — exceções pelo texto da carta). */
export const ATTR_MAX_BASE = 5;

const ATTR_LABEL: Record<AttrKey, string> = {
  corpo: "Corpo",
  mente: "Mente",
  alma: "Alma",
  destreza: "Destreza",
  conhecimento: "Conhecimento",
  foco: "Foco",
};

/** Parseia texto tipo "1 Corpo, 2 Alma, 3 Pontos Livres" vindos do catálogo. */
export function parseBonusLinha(texto: string): {
  attrs: Partial<Record<AttrKey, number>>;
  pontosLivres: number;
} {
  const attrs: Partial<Record<AttrKey, number>> = {};
  let pontosLivres = 0;
  if (!texto?.trim()) return { attrs, pontosLivres };

  const partes = texto.split(",").map((p) => p.trim()).filter(Boolean);
  for (const parte of partes) {
    const pl = parte.match(/^(\d+)\s*pontos?\s*livres?$/i);
    if (pl) {
      pontosLivres += parseInt(pl[1], 10);
      continue;
    }
    const m = parte.match(/^(\d+)\s+(.+)$/i);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const nome = m[2].trim().toLowerCase();
    const key = (
      Object.entries(ATTR_LABEL).find(
        ([, label]) => label.toLowerCase() === nome
      )?.[0] ?? null
    ) as AttrKey | null;
    if (key) attrs[key] = (attrs[key] ?? 0) + n;
  }
  return { attrs, pontosLivres };
}

/** Lê JSON importado no banco: `{ "csv": "1 Corpo, ..." }` ou string legacy. */
export function parseAtributosIniciais(json: unknown): {
  attrs: Partial<Record<AttrKey, number>>;
  pontosLivres: number;
  textoBruto: string;
} {
  let raw = "";
  if (json && typeof json === "object" && "csv" in json) {
    raw = String((json as { csv?: string }).csv ?? "");
  } else if (typeof json === "string") {
    raw = json;
  }
  const { attrs, pontosLivres } = parseBonusLinha(raw);
  return { attrs, pontosLivres, textoBruto: raw };
}

/** Soma mapas de atributos (base + classe + distribuição livre). */
export const ATTR_KEYS = Object.keys(ATTR_LABEL) as AttrKey[];

/** Garante 0…ATTR_MAX_BASE nos atributos salvos na linha do personagem (não aplica a bônus temporários de cartas). */
export function clampAttrsBase(attrs: Record<AttrKey, number>): Record<AttrKey, number> {
  const out = { ...attrs };
  for (const k of ATTR_KEYS) {
    const n = Math.floor(Number(out[k]) || 0);
    out[k] = Math.min(ATTR_MAX_BASE, Math.max(0, n));
  }
  return out;
}

export function somarAttrs(
  bases: Partial<Record<AttrKey, number>>[]
): Record<AttrKey, number> {
  const out: Record<AttrKey, number> = {
    corpo: 0,
    mente: 0,
    alma: 0,
    destreza: 0,
    conhecimento: 0,
    foco: 0,
  };
  for (const b of bases) {
    for (const k of Object.keys(out) as AttrKey[]) {
      out[k] += b[k] ?? 0;
    }
  }
  return out;
}

/**
 * Reações por turno: guia cita tabela 0→1 até 5→4 e extrapolação (+1 a cada ~2 pontos).
 * Implementação explícita 0–8 destreza; acima extrapola.
 */
export function reacoesPorTurno(destreza: number): number {
  const d = Math.max(0, Math.floor(destreza));
  const table = [1, 1, 2, 3, 4, 4, 5, 5, 6];
  if (d < table.length) return table[d];
  return table[table.length - 1] + Math.floor((d - (table.length - 1)) / 2);
}

/** Esquiva inicial = 6 + valor usado como modificador (atributo Destreza na ficha). */
export function calcularEsquiva(destreza: number): number {
  return 6 + destreza;
}

/** Vida máxima (guia 8.1): Raça + Σ Classes + Corpo + bônus cartas (0 na criação). */
export function calcularVidaMaxima(
  vidaRaca: number,
  somaVidaClasses: number,
  corpo: number,
  bonusCartas = 0
): number {
  return vidaRaca + somaVidaClasses + corpo + bonusCartas;
}

/** Energia máxima (guia 8.4): Raça + Σ Classes + Alma + bônus. */
export function calcularEnergiaMaxima(
  energiaRaca: number,
  somaEnergiaClasses: number,
  alma: number,
  bonusCartas = 0
): number {
  return energiaRaca + somaEnergiaClasses + alma + bonusCartas;
}

/**
 * Bônus de atributos vindos do JSON da carta (`atributos_concedidos`), mesmo formato da raça/classe.
 * Cartas podem ultrapassar o teto de 5 no valor efetivo — isso é tratado na camada de exibição.
 */
export function bonusAttrsCarta(json: unknown): Partial<Record<AttrKey, number>> {
  return parseAtributosIniciais(json).attrs;
}

export { ATTR_LABEL };
