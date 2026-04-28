/**
 * Sincroniza linhas em `personagem_carta` com o conjunto desejado (substituição total).
 */
import { supabase } from "./supabaseClient";
import type { ClasseRow, RacaRow } from "./types";

export function idsCartasObrigatorias(raca: RacaRow, classes: ClasseRow[]): Set<number> {
  const s = new Set<number>();
  if (raca.habilidade_inata_id != null) s.add(raca.habilidade_inata_id as number);
  for (const c of classes) {
    if (c.habilidade_caracteristica_id != null) s.add(c.habilidade_caracteristica_id as number);
  }
  return s;
}

/** Garante cartas obrigatórias presentes; deduplica. */
export function mergeIdsCartasComObrigatorias(
  raca: RacaRow,
  classes: ClasseRow[],
  escolhidas: number[]
): number[] {
  const s = idsCartasObrigatorias(raca, classes);
  for (const id of escolhidas) s.add(id);
  return [...s];
}

export async function substituirCartasPersonagem(
  idPersonagem: string,
  idsCartas: number[]
): Promise<{ error: string | null }> {
  const { error: delErr } = await supabase.from("personagem_carta").delete().eq("id_personagem", idPersonagem);
  if (delErr) return { error: delErr.message };
  if (!idsCartas.length) return { error: null };
  const rows = idsCartas.map((id_carta) => ({ id_personagem: idPersonagem, id_carta }));
  const { error: insErr } = await supabase.from("personagem_carta").insert(rows);
  return { error: insErr?.message ?? null };
}
