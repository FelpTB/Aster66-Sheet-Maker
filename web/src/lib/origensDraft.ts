/**
 * Calcula o conjunto de origens disponível na criação/edição em memória,
 * espelhando a lógica de `origens_personagem` (raça + classes + cartas aprendidas).
 */
import { supabase } from "./supabaseClient";

export async function fetchOrigensParaDraft(
  idRaca: number,
  idsClasses: number[],
  idsCartasNaFicha: number[]
): Promise<Set<number>> {
  const s = new Set<number>();
  const racaQ = supabase.from("raca_origem").select("id_origem").eq("id_raca", idRaca);
  const classeQueries =
    idsClasses.length > 0
      ? supabase.from("classe_origem").select("id_origem").in("id_classe", idsClasses)
      : Promise.resolve({ data: [] as { id_origem: number }[] });
  const cartaQ =
    idsCartasNaFicha.length > 0
      ? supabase.from("carta_origem_concedida").select("id_origem").in("id_carta", idsCartasNaFicha)
      : Promise.resolve({ data: [] as { id_origem: number }[] });

  const [{ data: ro }, { data: co }, { data: cc }] = await Promise.all([racaQ, classeQueries, cartaQ]);
  for (const r of ro ?? []) s.add(r.id_origem as number);
  for (const r of co ?? []) s.add(r.id_origem as number);
  for (const r of cc ?? []) s.add(r.id_origem as number);
  return s;
}

/** Mesma regra que `personagem_pode_aprender_carta`, usando origens já calculadas. */
export async function podeAprenderComOrigens(origens: Set<number>, idCarta: number): Promise<boolean> {
  const { data: reqs } = await supabase
    .from("carta_origem_requisito_conjunto")
    .select("id_conjunto")
    .eq("id_carta", idCarta);
  if (!reqs?.length) return true;

  const conjuntoIds = [...new Set(reqs.map((r) => r.id_conjunto as number))];
  const { data: opcoes } = await supabase
    .from("carta_origem_requisito_opcao")
    .select("id_conjunto, id_origem")
    .in("id_conjunto", conjuntoIds);

  const porConjunto = new Map<number, number[]>();
  for (const c of conjuntoIds) porConjunto.set(c, []);
  for (const o of opcoes ?? []) {
    const arr = porConjunto.get(o.id_conjunto as number);
    if (arr) arr.push(o.id_origem as number);
  }

  for (const cid of conjuntoIds) {
    const opts = porConjunto.get(cid) ?? [];
    const ok = opts.some((oid) => origens.has(oid));
    if (!ok) return false;
  }
  return true;
}

export async function podeAprenderCartaDraft(
  idRaca: number,
  idsClasses: number[],
  idsCartasNaFicha: number[],
  idCartaAlvo: number
): Promise<boolean> {
  const origens = await fetchOrigensParaDraft(idRaca, idsClasses, idsCartasNaFicha);
  return podeAprenderComOrigens(origens, idCartaAlvo);
}
