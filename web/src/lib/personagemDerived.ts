/**
 * Valores efetivos na ficha = atributos base (≤5) + bônus de cartas (podem exceder o teto).
 * Derivados (vida/energia/reações/esquiva) usam atributos efetivos e bônus numéricos das cartas.
 */
import {
  bonusAttrsCarta,
  calcularEnergiaMaxima,
  calcularEsquiva,
  calcularVidaMaxima,
  reacoesPorTurno,
  somarAttrs,
  type AttrKey,
} from "./fichaRules";
import type { ClasseRow, RacaRow } from "./types";

export type CartaEfeitos = {
  atributos_concedidos: unknown;
  vida_concedida: number | null;
  energia_concedida: number | null;
};

export function mergeAttrsBaseECartas(
  base: Record<AttrKey, number>,
  cartas: CartaEfeitos[]
): Record<AttrKey, number> {
  const parts: Partial<Record<AttrKey, number>>[] = [base];
  for (const c of cartas) {
    parts.push(bonusAttrsCarta(c.atributos_concedidos));
  }
  return somarAttrs(parts);
}

export function somaBonusVidaEnergiaCartas(cartas: CartaEfeitos[]): { vida: number; energia: number } {
  return cartas.reduce(
    (acc, c) => ({
      vida: acc.vida + (c.vida_concedida ?? 0),
      energia: acc.energia + (c.energia_concedida ?? 0),
    }),
    { vida: 0, energia: 0 }
  );
}

/** Soma PV/PE das classes ligadas ao personagem (multiclasse futura soma várias linhas). */
export function computeDerivadosPersonagem(input: {
  raca: Pick<RacaRow, "vida_inicial" | "energia_inicial">;
  somaVidaClasses: number;
  somaEnergiaClasses: number;
  attrsEfetivos: Record<AttrKey, number>;
  bonusVidaCartas: number;
  bonusEnergiaCartas: number;
}) {
  const {
    raca,
    somaVidaClasses,
    somaEnergiaClasses,
    attrsEfetivos: a,
    bonusVidaCartas,
    bonusEnergiaCartas,
  } = input;
  return {
    vida_maxima: calcularVidaMaxima(
      raca.vida_inicial ?? 0,
      somaVidaClasses,
      a.corpo,
      bonusVidaCartas
    ),
    energia_maxima: calcularEnergiaMaxima(
      raca.energia_inicial ?? 0,
      somaEnergiaClasses,
      a.alma,
      bonusEnergiaCartas
    ),
    reacoes_por_turno: reacoesPorTurno(a.destreza),
    esquiva: calcularEsquiva(a.destreza),
  };
}

/** Na criação, só a classe inicial entra em PV/PE e atributos de classe; usa-se uma única ClasseRow. */
export function somaClasseInicial(c: ClasseRow | null): { vida: number; energia: number } {
  if (!c) return { vida: 0, energia: 0 };
  return { vida: c.vida_inicial ?? 0, energia: c.energia_inicial ?? 0 };
}
