import { useEffect, useMemo, useState } from "react";
import type { AttrKey } from "../lib/fichaRules";
import type { CartaCompleta } from "../lib/catalogQueries";
import {
  computeDerivadosPersonagem,
  mergeAttrsBaseECartas,
  somaBonusVidaEnergiaCartas,
} from "../lib/personagemDerived";
import { supabase } from "../lib/supabaseClient";
import type { ClasseRow, RacaRow } from "../lib/types";
import { CartaDetalheCompleto } from "./CartaDetalheCompleto";

export type PCR = { id_carta: number; carta: CartaCompleta };

type Props = {
  attrsBase: Record<AttrKey, number>;
  raca: RacaRow;
  classesList: ClasseRow[];
  cartas: PCR[];
  onCartasChange: (next: PCR[]) => void;
  /** Retorna se a carta pode ser acrescentada ao conjunto atual (origens / regras). */
  podeAdicionar: (idCarta: number) => Promise<boolean>;
  /** IDs que não podem ser removidos (ex.: inata + características). */
  idsCartasFixas?: Set<number>;
  titulo?: string;
  helpText?: string;
};

export function HabilidadesPainelAoVivo({
  attrsBase,
  raca,
  classesList,
  cartas,
  onCartasChange,
  podeAdicionar,
  idsCartasFixas,
  titulo = "Habilidades e cartas",
  helpText = "As alterações ficam neste painel até você salvar a ficha (botão Salvar na página ou na revisão).",
}: Props) {
  const [searchCarta, setSearchCarta] = useState("");
  const [searchHits, setSearchHits] = useState<CartaCompleta[]>([]);
  const [busyCarta, setBusyCarta] = useState<number | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const fixas = idsCartasFixas ?? new Set<number>();

  const cartasEfeito = useMemo(
    () =>
      cartas.map((r) => ({
        atributos_concedidos: r.carta.atributos_concedidos ?? {},
        vida_concedida: r.carta.vida_concedida ?? 0,
        energia_concedida: r.carta.energia_concedida ?? 0,
      })),
    [cartas]
  );

  const attrsEf = useMemo(() => mergeAttrsBaseECartas(attrsBase, cartasEfeito), [attrsBase, cartasEfeito]);

  const bonusVe = useMemo(() => somaBonusVidaEnergiaCartas(cartasEfeito), [cartasEfeito]);

  const live = useMemo(() => {
    const somaVida = classesList.reduce((s, c) => s + (c.vida_inicial ?? 0), 0);
    const somaEn = classesList.reduce((s, c) => s + (c.energia_inicial ?? 0), 0);
    return computeDerivadosPersonagem({
      raca,
      somaVidaClasses: somaVida,
      somaEnergiaClasses: somaEn,
      attrsEfetivos: attrsEf,
      bonusVidaCartas: bonusVe.vida,
      bonusEnergiaCartas: bonusVe.energia,
    });
  }, [raca, classesList, attrsEf, bonusVe]);

  useEffect(() => {
    const q = searchCarta.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        const { data } = await supabase.from("carta").select("*").ilike("nome_carta", `%${q}%`).order("nome_carta").limit(25);
        setSearchHits((data ?? []) as CartaCompleta[]);
      })();
    }, 280);
    return () => clearTimeout(t);
  }, [searchCarta]);

  async function adicionar(carta: CartaCompleta) {
    setBusyCarta(carta.id_carta);
    setLocalErr(null);
    if (cartas.some((x) => x.id_carta === carta.id_carta)) {
      setLocalErr("Esta carta já está na lista.");
      setBusyCarta(null);
      return;
    }
    const ok = await podeAdicionar(carta.id_carta);
    if (!ok) {
      setLocalErr(
        "Não é possível incluir esta carta com as origens atuais (incluindo cartas já listadas). Verifique requisitos."
      );
      setBusyCarta(null);
      return;
    }
    onCartasChange([...cartas, { id_carta: carta.id_carta, carta }]);
    setBusyCarta(null);
  }

  function remover(idCarta: number) {
    setLocalErr(null);
    if (fixas.has(idCarta)) {
      setLocalErr("Esta carta é obrigatória (raça/classe) e não pode ser removida.");
      return;
    }
    onCartasChange(cartas.filter((x) => x.id_carta !== idCarta));
  }

  return (
    <section style={{ marginTop: "1rem" }}>
      <h3 style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem" }}>{titulo}</h3>
      <p className="help">{helpText}</p>

      <div className="stat-block" style={{ marginBottom: "1rem" }}>
        <strong>Prévia (instantânea)</strong>
        <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem" }}>
          <li>
            Vida máx.: <strong>{live.vida_maxima}</strong> · Energia máx.: <strong>{live.energia_maxima}</strong>
          </li>
          <li>
            Reações: <strong>{live.reacoes_por_turno}</strong> · Esquiva: <strong>{live.esquiva}</strong>
          </li>
          <li style={{ marginTop: "0.35rem" }}>
            Atributos efetivos:{" "}
            {(["corpo", "mente", "alma", "destreza", "conhecimento", "foco"] as const).map((k) => (
              <span key={k} style={{ marginRight: "0.5rem" }}>
                {k.slice(0, 3)}. {attrsEf[k]}
              </span>
            ))}
          </li>
        </ul>
      </div>

      {localErr ? <p className="error-msg">{localErr}</p> : null}

      <h4 style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>Cartas na ficha</h4>
      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
        {cartas.map((r) => (
          <div key={r.id_carta}>
            <CartaDetalheCompleto carta={r.carta} />
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: "0.35rem" }}
              disabled={fixas.has(r.id_carta)}
              onClick={() => remover(r.id_carta)}
            >
              {fixas.has(r.id_carta) ? "Obrigatória (raça/classe)" : "Remover da lista"}
            </button>
          </div>
        ))}
        {cartas.length === 0 ? <p className="help">Nenhuma carta na lista.</p> : null}
      </div>

      <h4 style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>Buscar e adicionar carta</h4>
      <div className="field">
        <input
          value={searchCarta}
          onChange={(e) => setSearchCarta(e.target.value)}
          placeholder="Nome da habilidade (mín. 2 letras)"
        />
      </div>
      <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.5rem" }}>
        {searchHits.map((c) => (
          <div key={c.id_carta}>
            <CartaDetalheCompleto carta={c} compact />
            <button
              type="button"
              className="btn"
              style={{ marginTop: "0.35rem" }}
              disabled={busyCarta === c.id_carta || cartas.some((x) => x.id_carta === c.id_carta)}
              onClick={() => void adicionar(c)}
            >
              {busyCarta === c.id_carta ? "…" : "Incluir na lista"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
