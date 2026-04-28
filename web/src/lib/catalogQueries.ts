/**
 * Consultas ao catálogo Supabase (raça/classe/origens/cartas).
 */
import { ATTR_KEYS, ATTR_LABEL, parseAtributosIniciais, type AttrKey } from "./fichaRules";
import { supabase } from "./supabaseClient";
import type { CartaRow, ClasseRow, RacaRow } from "./types";

export type OrigemRow = {
  id_origem: number;
  nome: string;
  descricao: string | null;
};

export type CartaCompleta = CartaRow & {
  modo_uso?: string;
  tempo_de_uso?: string | null;
  alcance?: string | null;
  custo_energia?: number | null;
  custo_extra?: string | null;
  condicao_de_aprendizado?: string | null;
  palavras_chave?: string[] | null;
  texto_descricao?: string | null;
  texto_corpo?: string | null;
};

export function formatAttrsLegivel(attrs: Partial<Record<AttrKey, number>>): string {
  const parts: string[] = [];
  for (const k of ATTR_KEYS) {
    const v = attrs[k];
    if (v != null && v > 0) parts.push(`${v} ${ATTR_LABEL[k]}`);
  }
  return parts.join(", ") || "—";
}

/** FK embutida no PostgREST pode vir como objeto ou array de um elemento. */
function relacaoUm<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export function textoAtributosIniciais(json: unknown): { attrs: string; pontosLivres: string } {
  const p = parseAtributosIniciais(json);
  const attrs = formatAttrsLegivel(p.attrs);
  const pl =
    p.pontosLivres > 0 ? `${p.pontosLivres} ponto(s) livre(s)` : "";
  return {
    attrs,
    pontosLivres: pl || "—",
  };
}

export async function fetchCartaPorId(id: number | null): Promise<CartaCompleta | null> {
  if (id == null) return null;
  const { data, error } = await supabase.from("carta").select("*").eq("id_carta", id).maybeSingle();
  if (error || !data) return null;
  return data as CartaCompleta;
}

/** Cartas ligadas na tabela “concede origem ao aprender” para cada origem listada. */
export async function fetchCartasQueConcedemOrigens(
  idsOrigem: number[]
): Promise<Map<number, CartaCompleta[]>> {
  const map = new Map<number, CartaCompleta[]>();
  if (!idsOrigem.length) return map;
  const { data } = await supabase
    .from("carta_origem_concedida")
    .select("id_origem, carta(*)")
    .in("id_origem", idsOrigem)
    .limit(300);
  for (const row of data ?? []) {
    const o = row.id_origem as number;
    const c = relacaoUm(row.carta as CartaCompleta | CartaCompleta[] | null) as CartaCompleta | null;
    if (!c) continue;
    if (!map.has(o)) map.set(o, []);
    map.get(o)!.push(c);
  }
  return map;
}

/** Cartas que exigem pelo menos uma das origens nos requisitos (amostra para pré-visualização). */
export async function fetchCartasQueExigemAlgumaOrigem(idsOrigem: number[]): Promise<CartaCompleta[]> {
  if (!idsOrigem.length) return [];
  const { data: opcoes } = await supabase
    .from("carta_origem_requisito_opcao")
    .select("id_conjunto")
    .in("id_origem", idsOrigem);
  const conjuntoIds = [...new Set((opcoes ?? []).map((o) => o.id_conjunto as number))];
  if (!conjuntoIds.length) return [];
  const { data: conjs } = await supabase
    .from("carta_origem_requisito_conjunto")
    .select("id_carta, carta(*)")
    .in("id_conjunto", conjuntoIds)
    .limit(200);
  const seen = new Set<number>();
  const out: CartaCompleta[] = [];
  for (const row of conjs ?? []) {
    const id = row.id_carta as number;
    if (seen.has(id)) continue;
    seen.add(id);
    const c = relacaoUm(row.carta as CartaCompleta | CartaCompleta[] | null) as CartaCompleta | null;
    if (c) out.push(c);
  }
  return out;
}

export async function fetchPreviewRaca(idRaca: number): Promise<{
  raca: RacaRow | null;
  origens: OrigemRow[];
  inata: CartaCompleta | null;
  concedemPorOrigem: Map<number, CartaCompleta[]>;
  exigemOrigem: CartaCompleta[];
}> {
  const { data: raca } = await supabase.from("raca").select("*").eq("id_raca", idRaca).maybeSingle();
  if (!raca) {
    return { raca: null, origens: [], inata: null, concedemPorOrigem: new Map(), exigemOrigem: [] };
  }
  const rr = raca as RacaRow;
  const { data: ro } = await supabase.from("raca_origem").select("origem(*)").eq("id_raca", idRaca);
  const origens = (ro ?? [])
    .map((x) => relacaoUm((x as { origem: OrigemRow | OrigemRow[] | null }).origem))
    .filter((o): o is OrigemRow => o != null);

  const inata = await fetchCartaPorId(rr.habilidade_inata_id);

  const ids = origens.map((o) => o.id_origem);
  const concedemPorOrigem = await fetchCartasQueConcedemOrigens(ids);
  const exigemOrigem = await fetchCartasQueExigemAlgumaOrigem(ids);

  return { raca: rr, origens, inata, concedemPorOrigem, exigemOrigem };
}

export async function fetchPreviewClasse(idClasse: number): Promise<{
  classe: ClasseRow | null;
  origens: OrigemRow[];
  caracteristica: CartaCompleta | null;
  concedemPorOrigem: Map<number, CartaCompleta[]>;
  exigemOrigem: CartaCompleta[];
}> {
  const { data: classe } = await supabase.from("classe").select("*").eq("id_classe", idClasse).maybeSingle();
  if (!classe) {
    return { classe: null, origens: [], caracteristica: null, concedemPorOrigem: new Map(), exigemOrigem: [] };
  }
  const cr = classe as ClasseRow;
  const { data: co } = await supabase.from("classe_origem").select("origem(*)").eq("id_classe", idClasse);
  const origens = (co ?? [])
    .map((x) => relacaoUm((x as { origem: OrigemRow | OrigemRow[] | null }).origem))
    .filter((o): o is OrigemRow => o != null);

  const caracteristica = await fetchCartaPorId(cr.habilidade_caracteristica_id);

  const ids = origens.map((o) => o.id_origem);
  const concedemPorOrigem = await fetchCartasQueConcedemOrigens(ids);
  const exigemOrigem = await fetchCartasQueExigemAlgumaOrigem(ids);

  return { classe: cr, origens, caracteristica, concedemPorOrigem, exigemOrigem };
}
