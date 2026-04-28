import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Link, useParams, useSearchParams } from "react-router-dom";

import { HabilidadesPainelAoVivo } from "../components/HabilidadesPainelAoVivo";

import { ATTR_KEYS, ATTR_LABEL, ATTR_MAX_BASE } from "../lib/fichaRules";

import type { AttrKey } from "../lib/fichaRules";

import type { CartaCompleta } from "../lib/catalogQueries";

import { mergeAttrsBaseECartas } from "../lib/personagemDerived";

import { podeAprenderCartaDraft } from "../lib/origensDraft";

import {
  idsCartasObrigatorias,
  mergeIdsCartasComObrigatorias,
  substituirCartasPersonagem,
} from "../lib/personagemCartas";

import { recalcularESalvarPersonagem } from "../lib/updateFicha";

import { supabase } from "../lib/supabaseClient";

import type { ClasseRow, PersonagemRow, RacaRow } from "../lib/types";

type Row = PersonagemRow & {
  raca?: { nome_raca: string } | null;
};

type PCRRow = {
  id_carta: number;

  carta: CartaCompleta;
};

function baseAttrsFromRow(row: PersonagemRow): Record<AttrKey, number> {
  return {
    corpo: row.corpo,

    mente: row.mente,

    alma: row.alma,

    destreza: row.destreza,

    conhecimento: row.conhecimento,

    foco: row.foco,
  };
}

function zeroAttrs(): Record<AttrKey, number> {
  return {
    corpo: 0,

    mente: 0,

    alma: 0,

    destreza: 0,

    conhecimento: 0,

    foco: 0,
  };
}

export function FichaViewPage() {
  const { id } = useParams<{ id: string }>();

  const [searchParams] = useSearchParams();

  const habRef = useRef<HTMLDivElement>(null);

  const [row, setRow] = useState<Row | null>(null);

  const [attrs, setAttrs] = useState<Record<AttrKey, number>>(() =>
    zeroAttrs(),
  );

  const [cartas, setCartas] = useState<PCRRow[]>([]);

  const [raca, setRaca] = useState<RacaRow | null>(null);

  const [classesList, setClassesList] = useState<ClasseRow[]>([]);

  const [err, setErr] = useState<string | null>(null);

  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    setErr(null);

    const { data: p, error } = await supabase

      .from("personagem")

      .select("*, raca(nome_raca)")

      .eq("id_personagem", id)

      .maybeSingle();

    if (error || !p) {
      setErr(error?.message ?? "Erro ao carregar");

      setLoading(false);

      return;
    }

    const pr = p as Row;

    setRow(pr);

    const ba = baseAttrsFromRow(pr);

    setAttrs(ba);

    const { data: racaData } = await supabase
      .from("raca")
      .select("*")
      .eq("id_raca", pr.id_raca)
      .maybeSingle();

    setRaca(racaData as RacaRow);

    const { data: pcl } = await supabase

      .from("personagem_classe")

      .select("ordem, classe(*)")

      .eq("id_personagem", id)

      .order("ordem", { ascending: true });

    const cls: ClasseRow[] = [];

    for (const x of pcl ?? []) {
      const raw = x as { classe: ClasseRow | ClasseRow[] | null };

      const cl = Array.isArray(raw.classe)
        ? (raw.classe[0] ?? null)
        : raw.classe;

      if (cl) cls.push(cl);
    }

    setClassesList(cls);

    const { data: pc } = await supabase
      .from("personagem_carta")
      .select("id_carta, carta(*)")
      .eq("id_personagem", id);

    setCartas((pc ?? []) as unknown as PCRRow[]);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (searchParams.get("cartas") === "1" && habRef.current && !loading) {
      habRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams, loading]);

  const cartasEfeito = cartas.map((r) => ({
    atributos_concedidos: r.carta.atributos_concedidos ?? {},

    vida_concedida: r.carta.vida_concedida ?? 0,

    energia_concedida: r.carta.energia_concedida ?? 0,
  }));

  const attrsEfetivos = row ? mergeAttrsBaseECartas(attrs, cartasEfeito) : null;

  const idsFixos = useMemo(() => {
    if (!raca) return new Set<number>();
    return idsCartasObrigatorias(raca, classesList);
  }, [raca, classesList]);

  async function salvarAlteracoesRapidas() {
    if (!id || !raca || !row) return;

    setSaving(true);

    setSaveErr(null);

    const ce = cartas.map((r) => ({
      atributos_concedidos: r.carta.atributos_concedidos ?? {},

      vida_concedida: r.carta.vida_concedida ?? 0,

      energia_concedida: r.carta.energia_concedida ?? 0,
    }));

    const { error: e1 } = await recalcularESalvarPersonagem({
      id_personagem: id,

      raca,

      classes: classesList,

      cartas: ce,

      attrsBase: attrs,
    });

    if (e1) {
      setSaveErr(e1);

      setSaving(false);

      return;
    }

    const idsMerged = mergeIdsCartasComObrigatorias(
      raca,

      classesList,

      cartas.map((x) => x.id_carta),
    );

    const { error: e2 } = await substituirCartasPersonagem(id, idsMerged);

    if (e2) setSaveErr(e2);

    await reload();

    setSaving(false);
  }

  const mostraEfetivo =
    attrsEfetivos && ATTR_KEYS.some((k) => attrsEfetivos[k] !== attrs[k]);

  if (err)
    return (
      <div className="app-shell">
        <p className="error-msg">{err}</p>
      </div>
    );

  if (!row || loading)
    return (
      <div className="app-shell">
        <p>Carregando…</p>
      </div>
    );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" style={{ color: "#e8dcc8" }}>
          ← Painel
        </Link>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            className="btn secondary"
            to={`/ficha/${id}/edit`}
            style={{ fontSize: "0.9rem" }}
          >
            Editar ficha completa
          </Link>
        </div>
      </header>

      <div className="sheet-paper">
        <h1 className="sheet-title">{row.nome}</h1>

        <p style={{ color: "var(--ink-muted)", marginTop: 0 }}>
          {row.raca?.nome_raca ?? "—"}

          {row.idade != null ? ` · ${row.idade} anos` : ""}
        </p>

        {row.descricao ? (
          <p style={{ whiteSpace: "pre-wrap" }}>{row.descricao}</p>
        ) : null}

        <h3
          style={{
            borderBottom: "1px solid var(--border)",
            paddingBottom: "0.25rem",
          }}
        >
          Atributos e habilidades
        </h3>

        <p className="help" style={{ marginTop: 0 }}>
          Altere à vontade; use <strong>Salvar alterações</strong> para gravar
          atributos base e cartas no banco. Máximo base {ATTR_MAX_BASE} cada;
          efetivo inclui cartas.
        </p>

        {saveErr ? <p className="error-msg">{saveErr}</p> : null}

        <div
          className="sheet-grid sheet-grid-2"
          style={{ marginBottom: "1rem" }}
        >
          {ATTR_KEYS.map((k) => (
            <div key={k} className="field">
              <label htmlFor={`v-${k}`}>{ATTR_LABEL[k]}</label>

              <input
                id={`v-${k}`}
                type="number"
                min={0}
                max={ATTR_MAX_BASE}
                value={attrs[k]}
                onChange={(e) =>
                  setAttrs((prev) => ({
                    ...prev,

                    [k]: Math.min(
                      ATTR_MAX_BASE,
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    ),
                  }))
                }
              />

              {attrsEfetivos && mostraEfetivo ? (
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--ink-muted)",
                    marginLeft: "0.35rem",
                  }}
                >
                  efetivo {attrsEfetivos[k]}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => void salvarAlteracoesRapidas()}
        >
          {saving ? "Salvando…" : "Salvar alterações (atributos + cartas)"}
        </button>

        <h3
          style={{
            borderBottom: "1px solid var(--border)",
            paddingBottom: "0.25rem",
            marginTop: "1.25rem",
          }}
        >
          Combate e status
        </h3>

        <ul>
          <li>
            Vida: {row.vida_atual} / {row.vida_maxima}
          </li>

          <li>
            Energia: {row.energia_atual} / {row.energia_maxima}
          </li>

          <li>Reações por turno: {row.reacoes_por_turno}</li>

          <li>Esquiva: {row.esquiva}</li>

          <li>Bloqueio: {row.bloqueio}</li>

          <li>Deslocamento: {String(row.deslocamento_metros)} m</li>

          <li>Cicatrizes: {row.cicatrizes}</li>

          <li>Ligação: {row.ligacao}</li>
        </ul>

        <h3
          style={{
            borderBottom: "1px solid var(--border)",
            paddingBottom: "0.25rem",
          }}
        >
          Inventário (espaços)
        </h3>

        <ul>
          <li>Em mãos: {row.slots_em_maos}</li>

          <li>Equipado: {row.slots_equipado}</li>

          <li>Acesso rápido: {row.slots_acesso_rapido}</li>

          <li>Guardado: {row.slots_guardado}</li>
        </ul>

        <div ref={habRef}>
          {id && raca ? (
            <HabilidadesPainelAoVivo
              attrsBase={attrs}
              raca={raca}
              classesList={classesList}
              cartas={cartas}
              onCartasChange={setCartas}
              podeAdicionar={async (idCarta) =>
                podeAprenderCartaDraft(
                  raca.id_raca,

                  classesList.map((c) => c.id_classe),

                  cartas.map((x) => x.id_carta),

                  idCarta,
                )
              }
              idsCartasFixas={idsFixos}
              titulo="Habilidades — detalhes e baralho"
              helpText="Inclua ou remova cartas aqui; as mudanças só entram no banco quando você clicar em Salvar alterações acima."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
