/**
 * Atualiza personagem e recalcula derivados a partir de atributos base, raça, classes e cartas aprendidas.
 */
import { clampAttrsBase } from "./fichaRules";
import type { AttrKey } from "./fichaRules";
import {
  computeDerivadosPersonagem,
  mergeAttrsBaseECartas,
  somaBonusVidaEnergiaCartas,
  type CartaEfeitos,
} from "./personagemDerived";
import { supabase } from "./supabaseClient";
import type { ClasseRow, PersonagemRow, RacaRow } from "./types";

type ExtrasEdit = Partial<
  Pick<
    PersonagemRow,
    | "nome"
    | "idade"
    | "descricao"
    | "vida_atual"
    | "energia_atual"
    | "bloqueio"
    | "deslocamento_metros"
    | "cicatrizes"
    | "ligacao"
    | "slots_em_maos"
    | "slots_equipado"
    | "slots_acesso_rapido"
    | "slots_guardado"
  >
>;

export async function recalcularESalvarPersonagem(input: {
  id_personagem: string;
  raca: RacaRow;
  classes: ClasseRow[];
  cartas: CartaEfeitos[];
  attrsBase: Record<AttrKey, number>;
  extras?: ExtrasEdit;
}): Promise<{ error: string | null }> {
  const attrs = clampAttrsBase(input.attrsBase);
  const attrsEf = mergeAttrsBaseECartas(attrs, input.cartas);
  const bonusVe = somaBonusVidaEnergiaCartas(input.cartas);

  const somaVida = input.classes.reduce((s, c) => s + (c.vida_inicial ?? 0), 0);
  const somaEn = input.classes.reduce((s, c) => s + (c.energia_inicial ?? 0), 0);

  const deriv = computeDerivadosPersonagem({
    raca: input.raca,
    somaVidaClasses: somaVida,
    somaEnergiaClasses: somaEn,
    attrsEfetivos: attrsEf,
    bonusVidaCartas: bonusVe.vida,
    bonusEnergiaCartas: bonusVe.energia,
  });

  const vmax = deriv.vida_maxima;
  const emax = deriv.energia_maxima;

  let vida_atual = input.extras?.vida_atual;
  let energia_atual = input.extras?.energia_atual;

  if (vida_atual === undefined || energia_atual === undefined) {
    const { data: cur } = await supabase
      .from("personagem")
      .select("vida_atual, energia_atual")
      .eq("id_personagem", input.id_personagem)
      .maybeSingle();
    if (vida_atual === undefined) vida_atual = (cur?.vida_atual as number) ?? vmax;
    if (energia_atual === undefined) energia_atual = (cur?.energia_atual as number) ?? emax;
  }

  const va = Math.min(vmax, Math.max(0, vida_atual ?? vmax));
  const ea = Math.min(emax, Math.max(0, energia_atual ?? emax));

  const { nome, idade, descricao, bloqueio, deslocamento_metros, cicatrizes, ligacao, slots_em_maos, slots_equipado, slots_acesso_rapido, slots_guardado } =
    input.extras ?? {};

  const patch: Record<string, unknown> = {
    corpo: attrs.corpo,
    mente: attrs.mente,
    alma: attrs.alma,
    destreza: attrs.destreza,
    conhecimento: attrs.conhecimento,
    foco: attrs.foco,
    vida_maxima: vmax,
    energia_maxima: emax,
    vida_atual: va,
    energia_atual: ea,
    reacoes_por_turno: deriv.reacoes_por_turno,
    esquiva: deriv.esquiva,
  };

  if (nome !== undefined) patch.nome = nome;
  if (idade !== undefined) patch.idade = idade;
  if (descricao !== undefined) patch.descricao = descricao;
  if (bloqueio !== undefined) patch.bloqueio = bloqueio;
  if (deslocamento_metros !== undefined) patch.deslocamento_metros = deslocamento_metros;
  if (cicatrizes !== undefined) patch.cicatrizes = cicatrizes;
  if (ligacao !== undefined) patch.ligacao = ligacao;
  if (slots_em_maos !== undefined) patch.slots_em_maos = slots_em_maos;
  if (slots_equipado !== undefined) patch.slots_equipado = slots_equipado;
  if (slots_acesso_rapido !== undefined) patch.slots_acesso_rapido = slots_acesso_rapido;
  if (slots_guardado !== undefined) patch.slots_guardado = slots_guardado;

  const { error } = await supabase.from("personagem").update(patch).eq("id_personagem", input.id_personagem);

  return { error: error?.message ?? null };
}
