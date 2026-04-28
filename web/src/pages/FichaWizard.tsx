import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HabilidadesPainelAoVivo, type PCR } from "../components/HabilidadesPainelAoVivo";
import { PreviewPainelClasse, PreviewPainelRaca } from "../components/CatalogPreviewPanels";
import { useAuth } from "../contexts/AuthContext";
import { fetchPreviewClasse, fetchPreviewRaca } from "../lib/catalogQueries";
import type { AttrKey } from "../lib/fichaRules";
import { ATTR_LABEL, ATTR_MAX_BASE, ATTR_KEYS, parseAtributosIniciais, somarAttrs } from "../lib/fichaRules";
import { podeAprenderCartaDraft } from "../lib/origensDraft";
import {
  computeDerivadosPersonagem,
  mergeAttrsBaseECartas,
  somaBonusVidaEnergiaCartas,
  somaClasseInicial,
} from "../lib/personagemDerived";
import { salvarNovaFicha } from "../lib/saveFicha";
import { supabase } from "../lib/supabaseClient";
import type { ClasseRow, RacaRow } from "../lib/types";

function emptyAttrs(): Record<AttrKey, number> {
  return {
    corpo: 0,
    mente: 0,
    alma: 0,
    destreza: 0,
    conhecimento: 0,
    foco: 0,
  };
}

export function FichaWizard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [racas, setRacas] = useState<RacaRow[]>([]);
  const [classes, setClasses] = useState<ClasseRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idRaca, setIdRaca] = useState<number | null>(null);
  /** Apenas uma classe inicial; multiclasse é tratada depois na mesa / edição futura. */
  const [idClasse, setIdClasse] = useState<number | null>(null);
  const [extraAttrs, setExtraAttrs] = useState<Record<AttrKey, number>>(emptyAttrs());

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [previewRaca, setPreviewRaca] = useState<Awaited<ReturnType<typeof fetchPreviewRaca>> | null>(null);
  const [previewClasse, setPreviewClasse] = useState<Awaited<ReturnType<typeof fetchPreviewClasse>> | null>(null);
  /** Cartas extras além de inata + característica (estado local até salvar). */
  const [extrasWizard, setExtrasWizard] = useState<PCR[]>([]);

  useEffect(() => {
    (async () => {
      const [r1, r2] = await Promise.all([
        supabase.from("raca").select("*").order("nome_raca"),
        supabase.from("classe").select("*").order("nome_classe"),
      ]);
      if (r1.error) setLoadErr(r1.error.message);
      else setRacas((r1.data ?? []) as RacaRow[]);
      if (r2.error) setLoadErr(r2.error.message);
      else setClasses((r2.data ?? []) as ClasseRow[]);
    })();
  }, []);

  useEffect(() => {
    if (idRaca == null) {
      setPreviewRaca(null);
      return;
    }
    let cancelled = false;
    fetchPreviewRaca(idRaca).then((p) => {
      if (!cancelled) setPreviewRaca(p);
    });
    return () => {
      cancelled = true;
    };
  }, [idRaca]);

  useEffect(() => {
    if (idClasse == null) {
      setPreviewClasse(null);
      return;
    }
    let cancelled = false;
    fetchPreviewClasse(idClasse).then((p) => {
      if (!cancelled) setPreviewClasse(p);
    });
    return () => {
      cancelled = true;
    };
  }, [idClasse]);

  const racaSel = racas.find((r) => r.id_raca === idRaca) ?? null;
  const classeSel = classes.find((c) => c.id_classe === idClasse) ?? null;

  const { baseAttrs, poolLivre } = useMemo(() => {
    if (!racaSel || !classeSel) return { baseAttrs: emptyAttrs(), poolLivre: 0 };
    let pool = 0;
    const parts: Partial<Record<AttrKey, number>>[] = [];
    const pr = parseAtributosIniciais(racaSel.atributos_iniciais);
    pool += pr.pontosLivres;
    parts.push(pr.attrs);
    const pc = parseAtributosIniciais(classeSel.atributos_iniciais);
    pool += pc.pontosLivres;
    parts.push(pc.attrs);
    const base = somarAttrs(parts);
    return { baseAttrs: base, poolLivre: pool };
  }, [racaSel, classeSel]);

  const attrsFinal = useMemo(() => somarAttrs([baseAttrs, extraAttrs]), [baseAttrs, extraAttrs]);

  const totalDistribuido = useMemo(
    () => ATTR_KEYS.reduce((s, k) => s + (extraAttrs[k] ?? 0), 0),
    [extraAttrs]
  );

  const poolRestante = poolLivre - totalDistribuido;

  const obrigatoriasPCR = useMemo((): PCR[] => {
    const m: PCR[] = [];
    if (previewRaca?.inata) m.push({ id_carta: previewRaca.inata.id_carta, carta: previewRaca.inata });
    if (previewClasse?.caracteristica) {
      m.push({ id_carta: previewClasse.caracteristica.id_carta, carta: previewClasse.caracteristica });
    }
    return m;
  }, [previewRaca?.inata, previewClasse?.caracteristica]);

  const todasCartasWizard = useMemo(() => {
    const map = new Map<number, PCR>();
    for (const x of obrigatoriasPCR) map.set(x.id_carta, x);
    for (const x of extrasWizard) map.set(x.id_carta, x);
    return [...map.values()];
  }, [obrigatoriasPCR, extrasWizard]);

  const idsFixosWizard = useMemo(
    () => new Set(obrigatoriasPCR.map((x) => x.id_carta)),
    [obrigatoriasPCR]
  );

  const derivadosComCartas = useMemo(() => {
    if (!racaSel || !classeSel) return null;
    const cartasEfeito = todasCartasWizard.map((r) => ({
      atributos_concedidos: r.carta.atributos_concedidos ?? {},
      vida_concedida: r.carta.vida_concedida ?? 0,
      energia_concedida: r.carta.energia_concedida ?? 0,
    }));
    const attrsEf = mergeAttrsBaseECartas(attrsFinal, cartasEfeito);
    const bonusVe = somaBonusVidaEnergiaCartas(cartasEfeito);
    const sc = somaClasseInicial(classeSel);
    return computeDerivadosPersonagem({
      raca: racaSel,
      somaVidaClasses: sc.vida,
      somaEnergiaClasses: sc.energia,
      attrsEfetivos: attrsEf,
      bonusVidaCartas: bonusVe.vida,
      bonusEnergiaCartas: bonusVe.energia,
    });
  }, [racaSel, classeSel, attrsFinal, todasCartasWizard]);

  function addPoint(attr: AttrKey) {
    if (poolRestante <= 0) return;
    if (attrsFinal[attr] >= ATTR_MAX_BASE) return;
    setExtraAttrs((e) => ({ ...e, [attr]: (e[attr] ?? 0) + 1 }));
  }

  function removePoint(attr: AttrKey) {
    setExtraAttrs((e) => {
      const v = e[attr] ?? 0;
      if (v <= 0) return e;
      return { ...e, [attr]: v - 1 };
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveErr(null);
    if (!user) {
      setSaveErr("Sessão inválida.");
      return;
    }
    if (!racaSel || !classeSel || poolRestante !== 0) {
      setSaveErr(
        poolRestante !== 0
          ? `Distribua todos os pontos livres (${poolRestante} restantes).`
          : "Escolha raça e uma classe inicial."
      );
      return;
    }
    setSaving(true);
    try {
      const { id_personagem, error } = await salvarNovaFicha({
        userId: user.id,
        nome,
        idade: idade.trim() ? parseInt(idade, 10) : null,
        descricao: descricao.trim() || null,
        raca: racaSel,
        classeInicial: classeSel,
        attrs: attrsFinal,
        extraCartaIds: extrasWizard.map((x) => x.id_carta),
      });
      if (error || !id_personagem) setSaveErr(error ?? "Erro ao salvar");
      else nav(`/ficha/${id_personagem}?cartas=1`);
    } finally {
      setSaving(false);
    }
  }

  const canNext1 = nome.trim().length >= 2;
  const canNext2 = idRaca !== null;
  const canNext3 = idClasse !== null;
  const canNext4 = poolRestante === 0 && racaSel !== null && classeSel !== null;

  const canNext5 = racaSel !== null && classeSel !== null && previewRaca !== null && previewClasse !== null;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" style={{ color: "#e8dcc8" }}>
          ← Painel
        </Link>
      </header>

      <div className="sheet-paper">
        <h1 className="sheet-title">Nova ficha</h1>
        <p className="help">
          Raça + <strong>uma</strong> classe inicial (atributos e PV/PE de classe só desta). Cada atributo
          fica no máximo <strong>{ATTR_MAX_BASE}</strong> na criação (cartas podem aumentar depois). Derivados
          seguem o Guia.
        </p>

        <nav className="steps-nav" aria-label="Etapas">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <span key={s} className={step === s ? "active" : ""}>
              {s}. {["Dados", "Raça", "Classe inicial", "Atributos", "Habilidades", "Revisão"][s - 1]}
            </span>
          ))}
        </nav>

        {loadErr ? <p className="error-msg">{loadErr}</p> : null}

        <form onSubmit={onSave}>
          {step === 1 && (
            <div className="sheet-grid">
              <div className="field">
                <label htmlFor="nome">Nome do personagem</label>
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Lyra Ferrônia"
                  required
                  minLength={2}
                />
              </div>
              <div className="field">
                <label htmlFor="idade">Idade (opcional)</label>
                <input
                  id="idade"
                  inputMode="numeric"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 24"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="desc">Descrição / conceito</label>
                <textarea
                  id="desc"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Aparência, objetivos, vínculos…"
                />
              </div>
              <button type="button" className="btn" disabled={!canNext1} onClick={() => setStep(2)}>
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="sheet-grid">
              <div className="field">
                <label htmlFor="raca">Raça</label>
                <select
                  id="raca"
                  value={idRaca ?? ""}
                  onChange={(e) =>
                    setIdRaca(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  required
                >
                  <option value="">— Selecione —</option>
                  {racas.map((r) => (
                    <option key={r.id_raca} value={r.id_raca}>
                      {r.nome_raca}
                    </option>
                  ))}
                </select>
              </div>
              {previewRaca?.raca ? (
                <PreviewPainelRaca
                  nomeRaca={previewRaca.raca.nome_raca}
                  textoDescricao={previewRaca.raca.texto_descricao}
                  vida={previewRaca.raca.vida_inicial ?? 0}
                  energia={previewRaca.raca.energia_inicial ?? 0}
                  atributosJson={previewRaca.raca.atributos_iniciais}
                  origens={previewRaca.origens}
                  inata={previewRaca.inata}
                  concedemPorOrigem={previewRaca.concedemPorOrigem}
                  exigemOrigem={previewRaca.exigemOrigem}
                />
              ) : idRaca ? (
                <p className="help">Carregando detalhes da raça…</p>
              ) : null}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn secondary" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button type="button" className="btn" disabled={!canNext2} onClick={() => setStep(3)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="sheet-grid">
              <p className="help">
                Escolha <strong>uma</strong> classe inicial. Multiclasse entra depois (sem somar atributos de
                classe adicional neste fluxo).
              </p>
              <div className="checkbox-grid">
                {classes.map((c) => (
                  <label key={c.id_classe}>
                    <input
                      type="radio"
                      name="classe-inicial"
                      checked={idClasse === c.id_classe}
                      onChange={() => setIdClasse(c.id_classe)}
                    />
                    <span>
                      <strong>{c.nome_classe}</strong>
                      <span style={{ color: "var(--ink-muted)", fontSize: "0.88rem" }}>
                        {" "}
                        — PV +{c.vida_inicial ?? 0}, Energia +{c.energia_inicial ?? 0}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {previewClasse?.classe ? (
                <PreviewPainelClasse
                  nomeClasse={previewClasse.classe.nome_classe}
                  textoDescricao={previewClasse.classe.texto_descricao}
                  vida={previewClasse.classe.vida_inicial ?? 0}
                  energia={previewClasse.classe.energia_inicial ?? 0}
                  atributosJson={previewClasse.classe.atributos_iniciais}
                  origens={previewClasse.origens}
                  caracteristica={previewClasse.caracteristica}
                  concedemPorOrigem={previewClasse.concedemPorOrigem}
                  exigemOrigem={previewClasse.exigemOrigem}
                />
              ) : idClasse ? (
                <p className="help">Carregando detalhes da classe…</p>
              ) : null}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn secondary" onClick={() => setStep(2)}>
                  Voltar
                </button>
                <button type="button" className="btn" disabled={!canNext3} onClick={() => setStep(4)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 4 && racaSel && classeSel && (
            <div className="sheet-grid">
              <p className="help">
                Pontos livres (raça + classe): distribua até o teto de <strong>{ATTR_MAX_BASE}</strong> por
                atributo (<strong>{poolRestante}</strong> pontos restantes).
              </p>
              <div className="sheet-grid sheet-grid-2">
                {ATTR_KEYS.map((k) => (
                  <div key={k} className="stat-block">
                    <div style={{ fontWeight: 700 }}>{ATTR_LABEL[k]}</div>
                    <div>
                      Base {baseAttrs[k]} + extra {extraAttrs[k] ?? 0} ={" "}
                      <strong>{attrsFinal[k]}</strong>
                      {attrsFinal[k] >= ATTR_MAX_BASE ? (
                        <span style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}> (máx.)</span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: "0.35rem" }}>
                      <button type="button" className="btn secondary" onClick={() => removePoint(k)}>
                        −
                      </button>{" "}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => addPoint(k)}
                        disabled={poolRestante <= 0 || attrsFinal[k] >= ATTR_MAX_BASE}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn secondary" onClick={() => setStep(3)}>
                  Voltar
                </button>
                <button type="button" className="btn" disabled={!canNext4} onClick={() => setStep(5)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 5 && racaSel && classeSel && idRaca != null && idClasse != null && (
            <div className="sheet-grid">
              <p className="help">
                Inclua cartas opcionais; inata da raça e característica da classe já entram na ficha e não podem ser
                removidas. Nada é gravado no banco até você concluir na etapa <strong>Revisão</strong>.
              </p>
              <HabilidadesPainelAoVivo
                attrsBase={attrsFinal}
                raca={racaSel}
                classesList={[classeSel]}
                cartas={todasCartasWizard}
                onCartasChange={(next) => {
                  const obrIds = new Set(obrigatoriasPCR.map((o) => o.id_carta));
                  setExtrasWizard(next.filter((x) => !obrIds.has(x.id_carta)));
                }}
                podeAdicionar={async (idCarta) => {
                  const idsNaFicha = todasCartasWizard.map((x) => x.id_carta);
                  return podeAprenderCartaDraft(idRaca, [idClasse], idsNaFicha, idCarta);
                }}
                idsCartasFixas={idsFixosWizard}
                titulo="Habilidades adicionais"
                helpText="A prévia atualiza na hora. As cartas serão gravadas quando você salvar a ficha na última etapa."
              />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn secondary" onClick={() => setStep(4)}>
                  Voltar
                </button>
                <button type="button" className="btn" disabled={!canNext5} onClick={() => setStep(6)}>
                  Revisar
                </button>
              </div>
            </div>
          )}

          {step === 6 && racaSel && classeSel && derivadosComCartas && (
            <div className="sheet-grid">
              <div className="sheet-grid sheet-grid-2">
                <div>
                  <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>Identidade</h3>
                  <p>
                    <strong>{nome}</strong>
                    {idade ? `, ${idade} anos` : ""}
                  </p>
                  {descricao ? (
                    <p style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{descricao}</p>
                  ) : null}
                  <p>
                    <strong>Raça:</strong> {racaSel.nome_raca}
                  </p>
                  <p>
                    <strong>Classe inicial:</strong> {classeSel.nome_classe}
                  </p>
                  <p className="help" style={{ marginTop: "0.5rem" }}>
                    Cartas na criação: <strong>{todasCartasWizard.length}</strong> (inclui obrigatórias +
                    opcionais).
                  </p>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>Derivados (com cartas)</h3>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    <li>
                      Vida máxima: <strong>{derivadosComCartas.vida_maxima}</strong>
                    </li>
                    <li>
                      Energia máxima: <strong>{derivadosComCartas.energia_maxima}</strong>
                    </li>
                    <li>
                      Reações/turno: <strong>{derivadosComCartas.reacoes_por_turno}</strong>
                    </li>
                    <li>
                      Esquiva: <strong>{derivadosComCartas.esquiva}</strong>
                    </li>
                    <li>Bloqueio: 0 · Deslocamento: 3 m</li>
                  </ul>
                </div>
              </div>
              <p className="help">
                Ao salvar, gravamos atributos, classe inicial e todas as cartas listadas (obrigatórias +
                opcionais).
              </p>
              {saveErr ? <p className="error-msg">{saveErr}</p> : null}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn secondary" onClick={() => setStep(5)}>
                  Voltar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar ficha"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
