/**
 * Persistência de personagem no Supabase (schema fichas_jogador).
 */
import { clampAttrsBase } from "./fichaRules";
import type { AttrKey } from "./fichaRules";
import {
  computeDerivadosPersonagem,
  mergeAttrsBaseECartas,
  somaBonusVidaEnergiaCartas,
  somaClasseInicial,
  type CartaEfeitos,
} from "./personagemDerived";
import { supabase } from "./supabaseClient";
import type { ClasseRow, RacaRow } from "./types";

export async function salvarNovaFicha(input: {
  userId: string;
  nome: string;
  idade: number | null;
  descricao: string | null;
  raca: RacaRow;
  classeInicial: ClasseRow;
  attrs: Record<AttrKey, number>;
  /** Cartas extras escolhidas no assistente (além de inata + característica). */
  extraCartaIds?: number[];
}): Promise<{ id_personagem: string | null; error: string | null }> {
  const { raca, classeInicial } = input;
  const attrsBase = clampAttrsBase(input.attrs);

  const obrigatorias = [raca.habilidade_inata_id, classeInicial.habilidade_caracteristica_id].filter(
    (x): x is number => x != null && Number.isFinite(Number(x))
  );
  const extras = (input.extraCartaIds ?? []).filter((x) => Number.isFinite(Number(x)));
  const idsCartasIniciais = [...new Set([...obrigatorias, ...extras])];

  let cartasIniciais: CartaEfeitos[] = [];
  if (idsCartasIniciais.length) {
    const { data: rowsCarta } = await supabase
      .from("carta")
      .select("atributos_concedidos, vida_concedida, energia_concedida")
      .in("id_carta", idsCartasIniciais);
    cartasIniciais = (rowsCarta ?? []) as CartaEfeitos[];
  }

  const attrsEf = mergeAttrsBaseECartas(attrsBase, cartasIniciais);
  const bonusVe = somaBonusVidaEnergiaCartas(cartasIniciais);
  const sc = somaClasseInicial(classeInicial);

  const deriv = computeDerivadosPersonagem({
    raca,
    somaVidaClasses: sc.vida,
    somaEnergiaClasses: sc.energia,
    attrsEfetivos: attrsEf,
    bonusVidaCartas: bonusVe.vida,
    bonusEnergiaCartas: bonusVe.energia,
  });

  const row = {
    id_usuario: input.userId,
    nome: input.nome.trim(),
    idade: input.idade,
    descricao: input.descricao?.trim() || null,
    id_raca: raca.id_raca,
    corpo: attrsBase.corpo,
    mente: attrsBase.mente,
    alma: attrsBase.alma,
    destreza: attrsBase.destreza,
    conhecimento: attrsBase.conhecimento,
    foco: attrsBase.foco,
    vida_maxima: deriv.vida_maxima,
    vida_atual: deriv.vida_maxima,
    energia_maxima: deriv.energia_maxima,
    energia_atual: deriv.energia_maxima,
    reacoes_por_turno: deriv.reacoes_por_turno,
    esquiva: deriv.esquiva,
    bloqueio: 0,
    deslocamento_metros: 3,
    cicatrizes: 0,
    ligacao: 0,
    slots_em_maos: 2,
    slots_equipado: 4,
    slots_acesso_rapido: 0,
    slots_guardado: 4,
  };

  const { data: ins, error: e1 } = await supabase
    .from("personagem")
    .insert(row)
    .select("id_personagem")
    .single();

  if (e1 || !ins) {
    return { id_personagem: null, error: e1?.message ?? "Falha ao criar personagem" };
  }

  const pid = ins.id_personagem as string;

  const { error: e2 } = await supabase.from("personagem_classe").insert({
    id_personagem: pid,
    id_classe: classeInicial.id_classe,
    ordem: 0,
  });
  if (e2) {
    await supabase.from("personagem").delete().eq("id_personagem", pid);
    return { id_personagem: null, error: e2.message };
  }

  const pCartas = idsCartasIniciais.map((id_carta) => ({
    id_personagem: pid,
    id_carta,
  }));
  if (pCartas.length) {
    const { error: e3 } = await supabase.from("personagem_carta").insert(pCartas);
    if (e3) {
      await supabase.from("personagem_classe").delete().eq("id_personagem", pid);
      await supabase.from("personagem").delete().eq("id_personagem", pid);
      return { id_personagem: null, error: e3.message };
    }
  }

  return { id_personagem: pid, error: null };
}

